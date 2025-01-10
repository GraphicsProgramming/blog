---
title: 'The Nabla FFT, FFT convolution and Bloom'
slug: 'the-nabla-fft-and-bloom'
description: 'Understanding and using the Nabla FFT'
date: '2024-01-10'
authors: ['fletterio']
tags: ['nabla', 'vulkan', 'article', 'tutorial', 'showcase']
last_update:
    date: '2025-01-10'
    author: Fletterio
---

Described as "the most important numerical algorithm of our lifetime", the FFT has applications in a plethora of domains.

In this article we show how to run an FFT in Nabla, talk about the ordering of the output and showcase one application in graphics: FFT Bloom. 

<!-- truncate -->

## FFT refresher

The following discussion is exclusively over discrete spaces. If you're familiar with the FFT and its uses you can skip ahead to the next section.

If you don't know what the DFT is, [go learn!](https://en.wikipedia.org/wiki/Discrete_Fourier_transform). It's a center piece of Digital Signal Processing. As a quick summary, the DFT is nothing but a change of basis in some vector space. Given a signal defined over some domain (spatial or temporal, usually), the "natural" representation of it is its "canonical basis decomposition" - which means mapping each point in space or time to the signal's value at that point. Thanks to Fourier, we have another very useful representation for the same signal, which involves its "spectral decomposition" - (periodic) functions defined over certain domains can always be written as a linear combination of some special orthogonal (w.r.t. some metric) functions over the same domain. The DFT is a linear transform that maps an $n$-dimensional vector $x$ representing some (periodic) signal to another $n$-dimensional vector $X$ such that the coordinates of $X$ are the coefficients of the linear decomposition of $x$ in this special basis. Those of you familiar with linear algebra will probably immediately recognize this is just a change of basis, computed as a matrix product $D \cdot x$, where $D$ is the matrix associated with the linear transform (the DFT).

As posed, however, the DFT is quite a slow operation: a matrix product is $O(n^2)$. That's where the FFT comes in! The (Cooley-Tukey) FFT exploits symmetries in the DFT's associated matrix to design a divide and conquer algorithm bringing its complexity to $O(n\log n)$. There are actually a bunch of FFT algorithms that work in a similar fashion and achieve the same time complexity, but in this article we will restrict the discussion to the classic Radix-2 Cooley-Tukey algorithm, which is what we use in Nabla. This algorithm is easier to implement than other FFT algorithms and maps nicely to the way parallelization is done in a GPU. The main drawback of it is that it only works on Power-of-Two sized (PoT for short) arrays. This requires us to pad any array we want to run an FFT on up to the next power of two. In some cases, it can result in a bunch of wasted compute power (worst cases have you wasting almost the same amount of compute as what you effectively actually need) but that's the price of convenience and simplicity, especially regarding the use of GPU hardware. Still, it runs pretty fast :).

Now you might be asking, why would I care about computing the DFT really fast? Well, there's a lot of operations that are accelerated with the FFT. One of those, as you might have guessed from the title of this article, is convolution. [The Convolution Theorem](https://en.wikipedia.org/wiki/Convolution_theorem#Periodic_convolution) states that we can perform a (circular) convolution as a Hadamard product in the spectral domain. This means that convolution goes from an $O(nm)$ operation ($n$ being the number of pixels of a signal and $m$ being the number of pixels of a filter) down to $O(n \log n)$ (assuming $n \ge m$): You do Forward FFT, then Hadamard product, then Inverse FFT, with the FFTs being $O(n \log n)$ and the product being $O(n)$. For small filters the FFT convolution ends up being slower, but for larger ones the speedup is massive.

## Using the Nabla FFT

I'm going to assume you're a little bit familiar with the Nabla API - if not, we have a series of posts coming up to get you up to speed with using Nabla. Also, the Nabla FFT is optimized to run on arrays that are not too big - we limit its usage to a single workgroup per FFT. This is because of our particular use cases, such as the Bloom example below.

To perform an FFT in Nabla, first we must know the scalar type of the complex numbers we'll be using at shader compilation time. We've only considered floats of 16, 32 and 64-bit precision, though anything that works at representing a real number should work. Do note that due to HLSL's implementation of $\sin$ and $\cos$, 64-bit precision doesn't make a whole lot of sense because those functions are limited to 32-bit precision. 

The next thing you are going to need to know at shader compilation time as well is the $\text{ElementsPerInvocation}$ and $\text{WorkgroupSize}$ you're going to be using. Here's the deal: you want to perform an FFT on a PoT-long array, let's call the length of this array $\text{FFTLength}$. You're going to be launching $\text{WorkgroupSize}$ many threads in a single workgroup to compute the FFT, each in charge of computing $\text{ElementsPerInvocation}$ positions in the output. This makes $\text{FFTLength} = \text{WorkgroupSize} \cdot \text{ElementsPerInvocation}$. Furthermore we have the restrictions $\text{ElementsPerInvocation} \ge 2$ and $\text{WorkgroupSize} \ge 32$. This is because of how the FFT is structured - more on that later. This means the minimum length an array must have is $64$. Our rule of thumb for choosing these parameters is to keep $\text{ElementsPerInvocation} = 2$ and max out $\text{WorkgroupSize}$ if possible, and only consider larger values of $\text{ElementsPerInvocation}$ when $2 \cdot \text{MaxWorkgroupSize} < \text{FFTLength}$, where $\text{MaxWorkgroupSize}$ is the largest possible workgroup size you're considering launching. The reasoning behind this rule is based on our implementation: keeping $\text{ElementsPerInvocation}$ low means that shuffles - threads interchaging some of their elements - happen in shared memory and not via the `Accessor`. Assuming the `Accessor` reads and writes from global memory, this gives much better latency. If using preloaded accessors, it gives better occupancy. 

We provide a function `workgroup::fft::optimalFFTParameters(uint32_t maxWorkgroupSize, uint32_t inputArrayLength)` that returns a struct with the base 2 logarithm of these values (because the FFT asks for the log2 of these values instead of the values themselves) based on this rule. Do note that the values returned will be for running an FFT of length `FFTLength = roundUpToPoT(inputArrayLength)`. You are responsible
for padding your data up to that size. You are of course allowed to use different values for these parameters if you see fit, as long as $\text{FFTLength = WorkgroupSize} \cdot \text{ElementsPerInvocation}$.
 
The next thing you're going to need is to define an `Accessor`. The `Accessor` pattern in Nabla is quite simple: it's a struct like the following:

```cpp
struct Accessor
{
  void set(index_t index, in T value);
  void get(index_t index, inout T value);
  // ... more stuff you might want to add
};
```

The idea of an accessor is just that: it's an abstraction to get and set elements from some array stored somewhere in memory. It's up to you to implement them, but they must at least provide those two methods. For a Nabla FFT, `index_t` MUST be `uint32_t` since we consider small arrays. Also, `T` MUST be `complex_t<scalar_t>`. Furthermore, the accessor MUST also provide a `void memoryBarrier()` method. This is because the FFT is done in-place, so there has to be some sort of barrier preventing reads to happen before a write that comes earlier is done. This method must thus result in a memory barrier with `AcquireRelease` semantics, properly set on the type of memory the `Accessor` accesses. There are exceptions to what this latter method must do. If using $\text{ElementsPerInvocation} = 2$, or using preloaded accessors (an example of those is in the Bloom example) then you are still forced to provide this method but you are allowed to make it do nothing. In the former case, because it just won't be called, in the latter because no memory accesses happen (preloaded accessors have elements resident in registers). 

One important thing about accessors is that unless $\text{ElementsPerInvocation} = 2$, `set(ix)` and `get(ix)` MUST write to the same thing, be it position in memory or register or whatever. This means that most FFTs MUST be done in-place. The way of doing out-of-place FFTs is with preloaded accessors: you run an FFT with them and afterwards decide how to write the data back to memory. 

The last thing you're going to need is a `SharedMemoryAccessor`. As the name indicates, it's similar to an `Accessor`, but it must access workgroup-shared memory. The memory it accesses MUST be able to hold at least
$\text{WorkgroupSize}$ many elements of type `complex_t<scalar_t>`. We provide a utility for calculating this for you. 

The `SharedMemoryAccessor` MUST provide at least the following methods:

```cpp
struct SharedMemoryAccessor
{
	template <typename IndexType, typename AccessType>
	void set(IndexType idx, AccessType value);

	template <typename IndexType, typename AccessType>
	void get(IndexType idx, NBL_REF_ARG(AccessType) value);

	void workgroupExecutionAndMemoryBarrier();
};
```

We don't really care about the templated methods (you can define your own `SharedMemoryAccessor` and use it outside of the FFT code as you see fit) but they must at least be able to be specialized with `IndexType` and `AccessType` being both `uint32_t`. `workgroupExecutionAndMemoryBarrier` is supposed to do exactly what you'd expect it to, in our examples it's just a `glsl::barrier()`. As long as it stops execution and
memory accesses until all threads in a workgroup have reached it (and as long as it doesn't have side effects on the shared memory or the memory the `Accessor` touches), you're welcome to make it do whatever else 
you see fit. 

The last thing you must do is define the method `uint32_t3 nbl::hlsl::glsl::gl_WorkGroupSize()`. We show how to up next.   

Once you have ALL of these you must do something like the following:

```cpp
using namespace nbl::hlsl;

using ConstevalParameters = workgroup::fft::ConstevalParameters<ElementsPerInvocationLog2, WorkgroupSizeLog2, scalar_t>;

groupshared uint32_t sharedmem[ ConstevalParameters::SharedMemoryDWORDs];

// Users MUST define this method for FFT to work
uint32_t3 glsl::gl_WorkGroupSize() { return uint32_t3(uint32_t(ConstevalParameters::WorkgroupSize), 1, 1); }

struct SharedMemoryAccessor 
{
  //...
};
struct Accessor
{
  // ...
};

[numthreads(ConstevalParameters::WorkgroupSize,1,1)]
void main(uint32_t3 ID : SV_DispatchThreadID)
{
	Accessor accessor = Accessor::create(pushConstants.deviceBufferAddress);
	SharedMemoryAccessor sharedmemAccessor;

	// FFT

	workgroup::FFT<false, ConstevalParameters>::template __call<Accessor, SharedMemoryAccessor>(accessor, sharedmemAccessor);
	sharedmemAccessor.workgroupExecutionAndMemoryBarrier();
	workgroup::FFT<true, ConstevalParameters>::template __call<Accessor, SharedMemoryAccessor>(accessor, sharedmemAccessor);	
}
```

Given compile-time known constants `ElementsPerInvocationLog2`, `WorkgroupSizeLog2`, and `scalar_t` we give an alias to the `workgroup::fft::ConstevalParameters` struct for clarity. 
The constexpr `ConstevalParameters::SharedMemoryDWORDs` tells us the size (in number of `uint32_t`s) that the shared memory array must have, so we use that to declare the array. Then, we define the 
`uint32_t3 glsl::gl_WorkGroupSize()` method. This is a bit boilerplate but it's necessary. We skip the definitions for the methods in the accessors, just assume the `SharedMemoryAccessor` writes and reads from 
the shared memory array and the `Accessor` reads and writes from an array we have already filled with the data we want to perform an FFT on. Then, we launch `ConstevalParameters::WorkgroupSize` many threads in a 
workgroup, instantiate the accessors and then run FFTs like shown above. The first is a Forward FFT and the second is an Inverse FFT. In the code above I'm running one after the other to showcase something important:
if you're going to use the shared memory after an FFT (in this case it's going to be used to run another FFT), you MUST do an execution and memory barrier like above. This is because we don't immediately block execution after the first FFT is done, so that if your threads need to do some work after the first FFT they can do so unbothered, but access to shared memory should be barriered if needed after the FFT.

The result of either FFT is actually exactly the same, save for normalization. The Inverse FFT divides the resulting array by $\text{FFTLength}$ at the end.

## The Nabla FFT order 

Sadly, I'm not talking about some evil faction in a sci-fi setting. I'm talking about the data layout after the FFT is done. You see, it's common for FFTs in most implementations to return the result in either the 
"natural" order (that is, the order you'd expect to get if you look at the definition of the DFT) or "bitreversed", which is the order a Radix-2 Cooley-Tukey FFT spits the result in (go look at a 
Decimation in Frequency FFT diagram). We instead choose to spit out the result in what we will call "Nabla" order. This is because we wanted to keep accessors' reads and writes coalesced for optimal latency. If we 
were to write the output in natural or bitreversed order, we risk thrashing the cache on the last write on the FFT, which can be quite expensive. So we made the FFT write its output in a coalesced manner, resulting
in a Nabla-ordered array. 

We provide functions to go from the Nabla order to the natural (DFT) order. We provide a struct `workgroup::fft::FFTIndexingUtils<ElementsPerInvocationLog2, WorkgroupSizeLog2>` with useful methods. In the 
following discussion, we'll call $\text{DFT}$ the natural-ordered array resulting from performing the DFT on some signal, and $\text{NFFT}$ the Nabla-ordered array resulting from calling our FFT on the same signal. `FFTIndexingUtils` provides the following methods:

* `uint32_t getDFTIndex(uint32_t outputIdx)`: given an index $\text{outputIdx}$ into the $\text{NFFT}$, it yields its corresponding $\text{freqIdx}$ into the $\text{DFT}$, such that 

    $\text{DFT}[\text{freqIdx}] = \text{NFFT}[\text{outputIdx}]$
* `uint32_t getNablaIndex(uint32_t freqIdx)`: given an index $\text{freqIdx}$ into the $\text{DFT}$, it yields its corresponding $\text{outputIdx}$ into the $\text{NFFT}$, such that 

    $\text{DFT}[\text{freqIdx}] = \text{NFFT}[\text{outputIdx}]$. It's essentially just the inverse of the previous method.
* `uint32_t getDFTMirrorIndex(uint32_t freqIdx)`: A common operation you might encounter using FFTs (especially FFTs of real signals) is to get the mirror around the middle (Nyquist frequency) of a given frequency. Given an index $\text{freqIdx}$ into the $\text{DFT}$, it returns a $\text{mirrorIndex}$ which is the index of its mirrored frequency, which satisfies the equation 

    $\text{freqIdx} + \text{mirrorIndex} = 0 \mod \text{FFTLength}$. Two elements don't have proper mirrors and are fixed points of this function: the Zero $($ index $0$ in the $\text{DFT})$ and Nyquist 
	
	$($ index $\frac {\text{FFTLength}} 2$ in the $\text{DFT})$ frequencies. 
* `uint32_t getNablaMirrorIndex(uint32_t outputIdx)`: Yields the same as above, but the input and output are given in Nabla order. This is not to say we mirror $\text{outputIdx}$ around the middle frequency of the Nabla-ordered array (that operation makes zero sense) but rather this function is just $\text{getNablaIndex} \circ \text{getDFTMirrorIndex} \circ \text{getDFTIndex}$. That is, get the corresponding index in the proper $\text{DFT}$ order, mirror THAT index around Nyquist, then go back to Nabla order. 

This struct also provides some additional methods, but we'll go over those later.

## Some inner workings of the Nabla FFT

The Nabla FFT works by emulating a Radix-2 Cooley-Tukey FFT Diagram with threads. Each step in such a diagram is associated with a "stride", which is the "distance" in the diagram between two elements taking part is what's known in the lingo as a "butterfly". Let's talk about Forward (Decimation in Frequency) FFTs, since Inverse FFTs work in the same way, just in reverse.

A Forward FFT starts with the biggest stride possible, which is $\frac {\text{FFTLength}} 2$, and computes different steps with different strides dividing the previous stride by 2 until the stride of the last butterfly is just 1. Each butterfly in an FFT diagram is computed by a single thread in our implementation. Then, the element swapping that you can see in such a diagram is emulated by threads trading (or "shuffling") their elements with each other.  

Our FFT works like this: first, if the stride is big enough (bigger than $\text{WorkgroupSize}$) it will use the `Accesor`'s memory to trade elements between threads. This only happens if $\text{ElementsPerInvocation} > 2$ and is what guides our rule of thumb for choosing the FFT parameters (the `Accessor` is usually high latency). Once the stride is small enough (at most $\text{WorkgroupSize}$) but bigger than the subgroup size, it will use shared memory to perform a shuffle. Then once the stride is small enough, it will use a subgroup shuffle (native operation in most GPUs) to perform the shuffle. Then at the end, when the FFT is done, threads write their elements via the `Accessor` to the same place they read from. This makes both reads and writes coalesced (when the `Accessor` goes to global memory).

## Real FFTs in Nabla

A bunch of signals we deal with are real and not complex. There is one particular trick when doing the FFT of real signals: if you have two real arrays $x$ and $y$ you can pack them as $z = x + iy$, perform a single
FFT on $z$, and later unpack $X$ and $Y$ from $Z$. An example is given in [this blog](https://kovleventer.com/blog/fft_real/). This means that we save on doing a whole FFT at the cost of packing/unpacking, which is
usually way cheaper than the FFT. Let's talk about some aspects of real FFTs in Nabla. 

Given $x$ and $y$, we'll call $\text{DFT}_x$ and $\text{DFT}_y$ their natural-ordered $\text{DFT}$s, and $\text{NFFT}_x$ and $\text{NFFT}_y$ their Nabla-ordered $\text{DFT}$s. 
### The unpacking rule

In the link to that blog above, we get a rule for unpacking $X$ and $Y$, namely 
$$\text{DFT}_x[T] = \frac 1 2 \left(\text{DFT}[T] + \text{DFT}[-T]^* \right) = \frac 1 2 \left(\text{NFFT}[F^{-1}(T)] + \text{NFFT}[F^{-1}(-T)]^*\right)$$

(with the equation for $\text{DFT}_y[T]$ being similar). This lets us work out a formula for unpacking the $\text{NFFT}$ result straight in Nabla order:

$$\text{NFFT}_x[T] = \text{DFT}_x[F(T)] = \frac 1 2 \left(\text{NFFT}[T] + \text{NFFT}[F^{-1}(-F(T))]^*\right)$$

and again a similar expression for $\text{NFFT}_y[T]$. The term $F^{-1}(-F(T))$ is exactly what `getNablaMirrorIndex` from the previous section computes.

### Zero and Nyquist

The Zero and Nyquist frequencies of a $\text{DFT}$ are important enough that they warrant knowing where they're located in the $\text{NFFT}$ (we could of course call `getNablaIndex` but this is also important not just for proofs but also for what to do after unpacking). It turns out that $\text{DFT}[0] = \text{NFFT}[0]$ and $\text{DFT}[\text{Nyquist}] = \text{NFFT}[\text{WorkgroupSize}].$

### Real FFT storage

A known fact of $\text{DFT}$ s of real signals is that they're conjugate-symmetric, meaning that $\text{DFT}[T] = \text{DFT}[-T]^*$. So, after performing the FFT of two packed real signals, you might want to keep only half of each, since the other half is redundant. In fact what's commonly done is to keep only the frequencies $\text{DFT}[0]$ through $\text{DFT}[\text{Nyquist}-1]$, and to pack the Nyquist frequency along Zero since they're both real: instead of $\text{DFT}[0]$ you keep $\text{DFT}[0] + i \cdot \text{DFT}[\text{Nyquist}]$. 

How do we keep the lower half of the $\text{DFT}$ in the Nabla order? We need a small definition first. It turns out that each thread in our workgroup is in charge of computing `\text{ElementsPerInvocation` elements of the $\text{NFFT}$, which are $\text{WorkgroupSize}$ apart. For example, when $\text{ElementsPerInvocation} = 4$, thread $0$ is in charge of computing $\text{NFFT}[0]$, $\text{NFFT}[\text{WorkgroupSize}]$, $\text{NFFT}[2 \cdot \text{WorkgroupSize}]$ and $\text{NFFT}[3 \cdot \text{WorkgroupSize}]$. More generally, a thread with ID $\text{threadID}$ is in charge of computing the elements ${\text{NFFT}[\text{threadID} + k \cdot \text{WorkgroupSize}]}$ for $k \in [0, \text{ElementsPerInvocation} - 1]$. We'll call an index $\text{ix}$ into the $\text{NFFT}$ "locally even" if $\text{ix} = \text{threadID} + k \cdot \text{WorkgroupSize}$ for some $\text{threadID}$ and even $k$. We then call the element $\text{NFFT}[\text{ix}]$ locally even if $\text{ix}$ is locally even.

Here's a cool fact: enumerating the locally even elements in increasing order yields a bitreversed lower half of the $\text{DFT}$. That is, first enumerate the indices $0, 1, \dots, \text{WorkgroupSize} - 1$. Then continue by enumerating $0 + 2 \cdot \text{WorkgroupSize}, 1 + 2 \cdot \text{WorkgroupSize}, \dots, (\text{WorkgroupSize}-1) +  2 \cdot \text{WorkgroupSize}$. Then again adding $4 \cdot \text{WorkgroupSize}$ to every possible value for $\text{threadID}$ and so on until you've covered all possible values of $ + k \cdot \text{WorkgroupSize}$ with even $k$. This enumeration will have exactly $\frac {\text{FFTLength}} 2$ indices. Call such an enumeration $f$, such that $f(n)$ maps $n \in [0, \frac {\text{FFTLength}} 2 - 1]$ to the $n$ th index in the enumeration given. Then, the array $\text{BRLH}$ such that $$\text{BRLH}[n] = \text{NFFT}[f(n)], \;\;{n \in \left[0, \frac {\text{FFTLength}} 2 - 1\right]}$$

ends up being the bit-reversed lower half of the $\text{DFT}$, with its indices considered $N - 1$ bit numbers, where $N = \log_2(\text{FFTLength})$. That is, $$\text{BRLH}[n] = \text{DFT}[\text{bitreverse}_{N-1}(n)], \;\;{n \in \left[0, \frac {\text{FFTLength}} 2 - 1\right]}.$$

So, saving only the locally even elements of the $\text{NFFT}$ amounts to storing the lower half of the $\text{DFT}$, just in a different order. Also, the trick to pack Zero and Nyquist together still works, it just becomes keeping 
$\text{NFFT}[0] + i \cdot \text{NFFT}[\text{WorkgroupSize}]$ instead of just $\text{NFFT}[0]$.

## FFT Bloom 

[Bloom](https://en.wikipedia.org/wiki/Bloom_(shader_effect)) is a pretty well known effect in both real-time and offline graphics. It simulates what happens to a camera's sensor when it gets overwhelmed with light: pixels 
that end up being too bright end up "spilling" light to nearby pixels. Simulating this "spilling" is naturally done via a convolution with some kernel. We want this kernel to be normalized in a way, so the convolution 
preserves the original image's total luminosity (as in, this effect should be energy-preserving). 

FFT Convolution is effective when we want to convolve two signals that are both "big enough". Big enough is relative, so let's give the example at hand: convolution of 2 images. If convolving an image against a kernel of,
say, `3x3`, `5x5`, maybe even `9x9` you're probably better off doing convolution in the spatial domain - you sum together a scaled copy of your kernel per pixel in the image, which is trivially parallelizable. However, once your
kernel gets big enough, this is no longer feasible. Remember this is an $O(nm)$ operation, so it's about linear on $n$ - the number of pixels of your image - while $m$ - the number of pixels of your kernel - is small 
enough. But as you increase the side length of your kernel, it scales quadratically. So, FFT Convolution is useful when you want to compute the exact convolution of two images, when none of them are small enough.

One key thing to take into account is the dimension of the result of a convolution. For two arrays of dimensions $N$ and $M$ the size of their convolution is $N + M - 1$. This sounds pointless, but it's actually related to 
the specific theorem we're using, which is the Circular Convolution Theorem. In short, when convolving two signals by doing the product of their spectra, we're assuming the signals to be periodic. That means that we're treating 
the image we see as a small sample of an actual signal which extends to infinity in both directions by repeating itself (think `GL_REPEAT`). The implication of this is that if you were to just multiply the spectra of an image and a kernel,
you might end up with a funny looking result if too much light spills off one end, because it ends up showing up on the other side. This artifact can be removed by ensuring there's at least padding for half the kernel's
length in each direction. So we're going to take our image's dimensions, add the kernel's dimensions to it and THEN pad the result up to PoT. This way, the necessary padding for no "wrap-arounds" is ensured to exist.

We must also decide how this padding happens. You see, if you pad your image with zeros your image will lose luminosity, especially near the borders. This is because pixels near the border end up spilling a bunch of 
light onto the padding, and receive no light back because the padding is completely dark. An alternative is to do mirror padding. This way, if your pixel spills some light onto the padding, the pixels in the padding
are spilling some light back. This can cause some artifacts in your image, however: pixels that are too bright near the border will add a LOT of luminosity. The only way to avoid having to suffer from *some* type of 
artifact is to run the convolution on a `(W+N) x (H+N)` image (`N` being the side length of your kernel), and then keeping the central `W x H` window of the result (but this means you have to render a LOT of useless pixels, so it's kinda not cool). 

For our example we ended up going with zero padding. Luminosity lost (both in total and towards the edges) isn't THAT much and it's barely noticeable when compared to artifacts created by mirror padding. 

### Our Bloom example

For our Bloom example we go with preloaded accessors. This means that instead of operating on 2 elements in registers at a time and going through global memory if $\text{ElementsPerInvocation} > 2$, we keep all elements resident 
in registers for the duration of the FFT. This kills occupancy, but the latency tradeoff is very much worth it, especially when we have to multiply the spectra. Some of the accessors, for example those used in the 
first FFT and the last IFFT, preload all channels at once. This is because they read/write from the same positions in the same texture for each channel, so we can bring that down to a single read and a single write. 
The other accessors read and write from and to buffers channel by channel, so they only preload one channel every time. Another advantage of preloaded accessors is that (albeit again at the cost of occupancy) you can 
have arbitrary-sized out-of-place FFTs (remember that you can actually only do out-of-place FFTs if $\text{ElementsPerInvocation} = 2$). With preloaded accessors you do them in-place (by writing the same registers all the time)
then at the end you're free to dump the result wherever. Since we want to prioritize writes being coalesced and contiguous before reads (because cache misses on write are more expensive than those on read) we 
ping-pong between a column-major and a row-major buffer and do the FFTs out-of-place.

The FFT Bloom example we have set up does the following: first we precompute the kernel's spectrum (this is done per channel) and keep (half of) it resident in GPU memory. We only keep half, because as we saw earlier the FFT of a real signal 
is conjugate-symmetric. This is done by running the FFT in the y-axis (packing two consecutive columns since they're real, then storing the lower half of the $\text{DFT}$ like discussed earlier) and then running the FFT in 
the x-axis over each resulting row. We can see that storing the lower half of the $\text{DFT}$ is not just beneficial because it saves space, but also because we don't have to compute redundant FFTs: since each row in 
the other half we didn't store is equal to the conjugate of a row we did store, [their FFTs are related](https://en.wikipedia.org/wiki/Discrete_Fourier_transform#Conjugation_in_time). 
We also normalize the result: you don't necessarily need to pass a normalized kernel. Normalization happens by dividing the resulting spectrum by the CIE Y (luminosity) of the element $(S_r, S_g, S_b)$, 
which are the total sums over each channel of the kernel, which are found as the `[0,0]` element of the resulting FFT (or rather, just the real part, since we decided to pack Nyquist in the imaginary part). 
Transforming that from RGB to CIE and keeping its Y means to get the total luminance of the kernel, so we divide by that value to make sure the result has total luminance 1. Normalization by dividing each channel by 
its total sum would be wrong: first, total luminance would not be 1, and second and more important, we lose the asymmetry in the kernel's response per channel. Also, elements in the spectra end up being multiplied by $(-1)^{x+y}$ where $x,y$ are their texture coordinates. This is a known trick that is equivalent to shifting the kernel half-way over each axis to center it.  

We never have to recompute the kernel's spectrum. Once that's done, we proceed as follows: take the image and launch one workgroup every two columns (we're doing $y$-axis first). Remember that these columns are padded on both ends with 
enough space for half the kernel's length and then some more, up to PoT. This padding is done with hardware samplers by sampling from a texture outside of the $[0,1]$ range. Then, much like we did for the kernel, we only store half of the result. Well, actually, that's a lie. What we do is store the full packed column 
and unpack the necessary elements in the next step. That is, after the $y$-axis FFT we store the whole result of each (packed) column in a buffer, then on the x-axis we launch half the amount of workgroups as there are elements in those columns 
(effectively each workgroup is going to be computing the FFT along some row of what would be the lower half of the $\text{DFT}$). Then, we unpack the result of the previous step as we load elements before this second FFT. This is because unpacking 
on store would require workgroup shuffles, but unpacking on load requires subgroup shuffles, which are faster and don't result in barriers. The row that has Zero and Nyquist of the previous FFT packed together 
furthermore recycles the packed FFT trick. 

When loading the elements for the second FFT, we again consider the mirror padding, this time doing the mirroring "by hand" since we're reading from a buffer and not sampling a texture. Then we run an FFT along the
x-axis. Now comes the multiplication part. The result of our FFTs is a spectrum of size `R(W) x R(H)` where `W x H` is the size of the original image and `R(x)` rounds an integer up to the next PoT. We're only going to 
do the product for the upper half of this spectrum since that's what we have in memory after all, but conceptually it's representing something of that size.
The spectra of the kernel we computed earlier, instead, is `N x N`. To be able to compute the product we do the following: for each element in our image's spectrum we compute its `uv` 
coordinates and sample the kernel spectrum at those coordinates using a hardware sampler. 

My math on what happens to the kernel when bilinearly interpolating the spectrum is a bit iffy. Our Lead Build System and Test Engineer, Arkadiusz, [has a Vulkanised talk discussing this technique a bit more in-depth](https://youtu.be/Ol_sHFVXvC0). 

In short, it's a rough type of polyphase filter. After the fractional upsampling in the spectral domain, we get both periodic repetition of the signal and aliasing in the spatial domain. The convolution with the tent filter after the upsampling is a product with a $\text{sinc}^2$ in the spatial domain, that kills the repeated signals but (since tent is not a perfect filter) some ringing survives, which can cause artifacts. Also, the aliasing is unaccounted for, since there's no (spatial) filtering before the upsampling. There is an assert in our bloom example on the ratio of the size kernel used to the size of the image. If this ratio is too low, there's going to be a lot of aliasing and the kernel will degrade (think about zooming out on an image - high frequency detail is lost the more you shrink it). This and potential artifacts caused due to ringing can always be solved by using a higher res kernel (potentially at the cost of speed, depending on the size of your image and kernel and how they round up to PoT).

Afterwards, we perform an IFFT on the result and only store the central columns back to memory (so we don't store any padding unnecessarily). Finally, we perform the last IFFT along the $y$-axis. We pack two columns together: since each column is the FFT of a real signal we perform a similar trick as before by packing two consecutive columns $X, Y$ as $Z = X + iY$, perform the IFFT to get $z = \text{IFFT}(Z)$ and then unpack $x = \text{Re}(z), y = \text{Im}(z)$. We do this at the same time as we expand columns back to their original size: remember we actually saved half of a column by storing the locally even elements, so we also make sure to set all locally odd elements with their corresponding values as well. After this last IFFT we keep the central pixels (again ignoring the padding on both sides) and store the result to output. 

### Dynamic

### Deciding which axis to run the FFT along first

All times reported below are for an RTX 4060 8GB, ASUS OC Edition.

The Bloom example is a bit hard-coded: the FFT is run first on the $y$-axis and then on the $x$-axis. This is only because of the dimensions considered for this particular example, which were an image of size `1280 x 720` and a kernel of size `256 x 256`.

By running $y$-axis first in our example, and then $x$-axis afterwards, we are doing `640` `1024`-sized FFTs followed by `512` `2048`-sized FFTs (that's just the forward FFTs, then you'd have the Hadamard product and the same number of IFFTs on the way back). This is because on the first pass we do one FFT per every pair of columns (yielding `640` passes) of size `1024 = roundUpToPot(720 + 256)` since we're considering padding. We store only half of each resulting column (actually we store the full packed columns but that's practically the same), giving `512` rows and then we run that many FFTs of size `2048 = roundUpToPoT(1280 + 256)`. Following the same logic, running $x$-axis first would have us do `360` `2048`-sized FFTs followed by `1024` `1024`-sized FFTs. 

Which one is better? Well in this particular case, $y$-axis first takes about $0.795 \; \text{ms}$ to run, while $x$-axis first takes about $1.01 \; \text{ms}$. That's a pretty big difference! 

If we change the kernel to a size of `512 x 512`, then doing $y$-axis first ends up costing `640` `2048`-sized FFTs followed by `1024` `2048`-sized FFTs. Doing $x$-axis first, on the other hand, costs `360` `2048`-sized FFTs followed by `1024` `2048`-sized FFTs. Unlike the previous case in which the FFTs to compare are all different-sized, this particular case is easier to analyze: $y$-axis first runs `1664` `2048`-sized FFTs in total while $x$-axis first runs `1384` FFTs of the same size, so it's reasonable to expect that $x$-axis first performs better in this case. Indeed, $x$-axis first takes about $1.44 \; \text{ms}$ to run, while $y$-axis first takes about $1.8 \; \text{ms}$. The ratio of total FFTs is very similar to the ratio of time taken: $\frac {1.44 \text{ ms}} {1.8 \text{ ms}} = 0.8$ and $\frac {1384} {1664} \approx 0.83$

In fact, these ratios were also very similar in the `256 x 256` kernel case as well, even if the FFTs were differently-sized. Without running many experiments with varying sizes and hardware, however, it's hard to decide which way is better without profiling, except in particular cases like the `512 x 512` kernel case above.

### Ringing

As discussed earlier, the polyphase filtering of the kernel spectrum will introduce ringing and aliasing. The aliasing is not too bad usually, you need the kernel to be WAY smaller than your image for the aliasing to become noticeable. Ringing, however, is easier to spot. Here's a comparison for the convolution between our image and the `256 x 256` kernel done with this technique and the "real" convolution. You can see a bit of extra light floating around where it makes no sense for it to be. This can be explained by looking at the graph of a $\text{sinc}^2$: even though this function is meant to kill the repeated copies of the kernel spawned by the upsampling of the kernel spectrum, the "secondary lobe" of the $\text{sinc}^2$ is big enough to cause the first repeated copy of the kernel to still be "big enough" to show visible artifacts. 

Ringing can be reduced by using a higher resolution kernel: 


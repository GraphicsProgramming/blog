---
title: 'Nvidia SPIR-V Compiler Bug or Do Subgroup Shuffle Operations Not Imply Reconvergence?'
slug: 'subgroup-shuffle-reconvergence-on-nvidia'
description: "A look at the behavior behind Nabla's subgroup scan"
date: '2025-06-19'
authors: ['keptsecret']
tags: ['nabla', 'vulkan', 'article']
last_update:
    date: '2025-06-19'
    author: keptsecret
---

Reduce and scan operations are core building blocks in the world of parallel computing, and now Nabla has a new release with those operations made even faster for Vulkan at the subgroup and workgroup levels.

This article takes a brief look at the Nabla implementation for reduce and scan on the GPU in Vulkan, and then a discussion on expected reconvergence behavior after subgroup operations.

<!-- truncate -->

## Reduce and Scan

Let's give a quick introduction, or recap for those already familiar, to reduce and scan operations.

A reduction takes a binary associative operator $\bigoplus$ and an array of $n$ elements

$\left[x_0, x_1,...,x_{n-1}\right]$,

and returns

$x_0 \bigoplus x_1 \bigoplus ... \bigoplus x_{n-1}$.

In other words, when $\bigoplus$ is an addition, a reduction of the array $X$ is then the sum of all elements of array $X$.

```
Input:      4  6  2  3  7  1  0  5
Reduction:  28
```

A scan is a generalization of reduction, and takes a binary associative operator $\bigoplus$ with identity $I$ and an array of $n$ elements.
Then, for each element, performs the reduction from the first element to the current element.
An _exclusive_ scan does so for all elements before the current element.

$\left[I, x_0, (x_0 \bigoplus x_1), ..., (x_0 \bigoplus x_1 \bigoplus ... \bigoplus x_{n-2})\right]$.

An _inclusive_ scan then includes the current element as well.

$\left[x_0, (x_0 \bigoplus x_1), ..., (x_0 \bigoplus x_1 \bigoplus ... \bigoplus x_{n-1})\right]$.

Notice the last element of the inclusive scan is the same as the reduction.

```
Input:      4  6  2  3  7  1  0  5
Exclusive:  0  4  10 12 15 22 23 23
Inclusive:  4  10 12 15 22 23 23 28
```

## Nabla's subgroup scans

We start with the most basic of building blocks: doing a reduction or a scan in the local subgroup of a Vulkan device.
Pretty simple actually, since Vulkan already has subgroup arithmetic operations supported via SPIRV, and it's all available in Nabla.

```cpp
nbl::hlsl::glsl::groupAdd(T value)
nbl::hlsl::glsl::groupInclusiveAdd(T value)
nbl::hlsl::glsl::groupExclusiveAdd(T value)
etc...
```

But wait, the SPIRV-provided operations all require your Vulkan physical device to have support the `GroupNonUniformArithmetic` capability.
So, Nabla provides emulated versions for that too, and it's all compiled into a single templated struct call.

```cpp
template<class Params, class BinOp, uint32_t ItemsPerInvocation, bool native>
struct inclusive_scan;

template<class Params, class BinOp, uint32_t ItemsPerInvocation, bool native>
struct exclusive_scan;

template<class Params, class BinOp, uint32_t ItemsPerInvocation, bool native>
struct reduction;
```

The implementation of emulated subgroup scans make use of subgroup shuffle operations to access partial sums from other invocations in the subgroup.

```cpp
T inclusive_scan(T value)
{
    rhs = shuffleUp(value, 1)
    value = value + (firstInvocation ? identity : rhs)

    for (i = 1; i < SubgroupSizeLog2; i++)
    {
        nextLevelStep = 1 << i
        rhs = shuffleUp(value, nextLevelStep)
        value = value + (nextLevelStep out of bounds ? identity : rhs)
    }
    return value
}
```

In addition, Nabla also supports passing vectors into these subgroup operations, so you can perform reduce or scans on up to subgroup size * 4 (for `vec4`) elements per call.
Note that it expects the elements in the vectors to be consecutive and in the same order as the input array.

You can find all the implementations on the [Nabla repository](https://github.com/Devsh-Graphics-Programming/Nabla/blob/master/include/nbl/builtin/hlsl/subgroup2/arithmetic_portability_impl.hlsl)

## An issue with subgroup sync and reconvergence

Now, onto a pretty significant, but strangely obscure, problem that I ran into during unit testing this prior to release.
Nabla also has implementations for workgroup reduce and scans that make use of the subgroup scans above, and one such section looks like this.

```cpp
... workgroup scan code ...

for (idx = 0; idx < VirtualWorkgroupSize / WorkgroupSize; idx++)
{
    value = getValueFromDataAccessor(memoryIdx)

    value = subgroup::inclusive_scan(value)

    setValueToDataAccessor(memoryIdx)

    if (lastSubgroupInvocation)
    {
        setValueToSharedMemory(smemIdx)
    }
}
control_barrier()

... workgroup scan code ...
```

At first glance, it looks fine, and it does produce the expected results for the most part... except in some very specific cases.
And from some more testing and debugging to try and identify the cause, I've found the conditions to be: 

* using an Nvidia GPU
* using emulated versions of subgroup operations
* a decent number of iterations in the loop (in this case at least 8).

I tested this on an Intel GPU, to be sure, and the workgroup scan ran correctly.
That was very baffling initially. And the results produced on an Nvidia device looked like a sync problem.

It was even more convincing when I moved the control barrier inside the loop and it immediately produced correct scan results.

```cpp
... workgroup scan code ...

for (idx = 0; idx < VirtualWorkgroupSize / WorkgroupSize; idx++)
{
    value = getValueFromDataAccessor(memoryIdx)

    value = subgroup::inclusive_scan(value)

    setValueToDataAccessor(memoryIdx)

    if (lastSubgroupInvocation)
    {
        setValueToSharedMemory(smemIdx)
    }
    control_barrier()
}

... workgroup scan code ...
```

Ultimately, we came to the conclusion that each subgroup invocation was probably somehow not in sync as each loop went on.
Particularly, the last invocation that spends some extra time writing to shared memory may have been lagging behind.
It is a simple fix to the emulated subgroup reduce and scan. A memory barrier was enough.

```cpp
T inclusive_scan(T value)
{
    memory_barrier()

    rhs = shuffleUp(value, 1)
    value = value + (firstInvocation ? identity : rhs)

    for (i = 1; i < SubgroupSizeLog2; i++)
    {
        nextLevelStep = 1 << i
        rhs = shuffleUp(value, nextLevelStep)
        value = value + (nextLevelStep out of bounds ? identity : rhs)
    }
    return value
}
```

As a side note, using the `SPV_KHR_maximal_reconvergence` extension doesn't resolve this issue surprisingly.

However, this was only a problem on Nvidia devices.
And as the title of this article states, it's unclear whether this is a bug in Nvidia's SPIRV compiler or subgroup shuffle operations just do not imply reconvergence in the spec.

-------------------

P.S. you may note in the source code that the memory barrier contains the workgroup memory mask, despite us only needing sync in the subgroup scope.

```cpp
spirv::memoryBarrier(spv::ScopeSubgroup, spv::MemorySemanticsWorkgroupMemoryMask | spv::MemorySemanticsAcquireMask);
```

This is because unfortunately, the subgroup memory mask doesn't seem to count as a storage class, at least according to the Vulkan SPIRV validator.
Only the next step up in memory level is valid.
I feel like there's possibly something missing here.

---
title: 'Ordered Dithering is Useful and Good'
slug: 'ordered-dithering-is-useful-and-good'
description: 'When ordered dithering with Bayer Matrices beats blue noise, and why you should use it everywhere'
date: '2026-04-09'
authors: ['jodie']
tags: ['dithering', 'glsl', 'opengl', 'optimization', 'article', 'bandwidth']
---

Dithering is the old trick of using patterns to fake more colors than you actually have.
If you've ever noticed the crosshatch pattern in old video games, that's ordered dithering.
It uses a repeating grid called a Bayer Matrix. It's carefully constructed so that adjacent
values are as far apart as possible, which maximally spreads error. Modern game
developers, in their infinite wisdom, have decided that this mathematical perfection is
a problem to be fixed. The regular pattern is too noticeable, they say. Instead they make
a fancy precomputed texture that has the same properties but with no regular pattern: Blue Noise.

<!-- truncate -->

Sure, blue noise looks great. But somewhere along the way we forgot why we're dithering in the
first place: to save memory. If you need a texture lookup to do dithering, you're spending
bandwidth to save bandwidth, it makes no sense. Ordered dithering is just 18 instructions
to compute from scratch.

```glsl
float dither256x256(uvec2 fragCoord){
  uint x = fragCoord.x ^ fragCoord.y;
  uint y = fragCoord.y;
  uint z = x << 16 | y;
  z |= z << 12;
  z &= 0xF0F0F0F0u;
  z |= z >> 6;
  z &= 0x33333333u;
  z |= z << 3;
  z &= 0xaaaaaaaau;
  z  = z >> 9 | z << 6;
  z &= 0x7fffffu;
  return uintBitsToFloat(
    floatBitsToUint(1.) | z
  ) - 1.5; // or -1.0 if you want 0..1
           // instead of -0.5..0.5
}
```
I came up with this independently around 2016[\*](#note-id-0). I found recently that the general idea of
interleaving and reversing bits was first described
[here](https://bisqwit.iki.fi/story/howto/dither/jy/)[\*](#note-id-0). But I'm
the first person to make this optimized implementation[\*](#note-id-0). Which is probably why it hasn't caught on yet.

When you're doing graphics programming, fast dithering should always be in your metaphorical
tool belt. You should *never* reach for higher bit depth without having first tried
dithering. Here's an example of how even rgb8 is overkill. This is a comparison between
rgb8 and rgb453. Can you tell which one is which?

![Bit Depth 1 — rgb453 with dithering](rgb453.png)

![Bit Depth 2 — rgb8 original](original.png)

Now here's without the dithering:

![rgb453 without dithering](rgb453nodither.png)

This is how huge the difference is!
You're throwing away half your ram by not dithering all your buffers.

## Not Just for Quantization

You can (and should) use Bayer Matrices everywhere you would use random sampling,
like for picking ray directions for lighting.

![One sample per pixel — Noise on the left, Bayer Matrix on the right](ibl-1s.png)

At only one sample per pixel, you can see how the Bayer Matrix grain could
easily be smoothed with a light blur. The noise grain has no chance.

![8 samples per pixel — Noise on the left, Bayer Matrix on the right](ibl-8s.png)

At eight samples per pixel, the Bayer Matrix sampling looks smooth already
while the noise sampling still looks rough.

Blurring white noise just gets you a splotchy mess, which you have to fix
by doing more samples, or a wider blur. Choosing to use white noise is the
dead raccoon in the river that makes everything downstream shit itself.

For temporal effects, you can also use the 1D equivalent of a bayer matrix:
reversing the bits for the index of the current frame, which gives this pattern:

![1D bit-reversal pattern](1d.png)

---

With technological progress, as pixel densities get higher and higher,
dither patterns become harder and harder to see and vram gets more and more
strained. Ordered dithering isn't just the past, it's the future as well!

## Notes

#### \* As far as I know. {#note-id-0} 
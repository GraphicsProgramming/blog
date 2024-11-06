---
title: 'My Screen is Black'
slug: 'my-screen-is-black'
description: 'This shall be a little guide to help you troubleshoot graphics problems. Focussing mainly on OpenGL.'
date: '2024-11-01'
authors: ['deccer']
tags: ['opengl', 'troubleshoot', 'guide', 'article', 'debug']
image: 'https://raw.githubusercontent.com/graphicsprogramming/blog/main/blog/2024/2024-11-01-my-screen-is-black/arrested-for-opengl-crimes-full.png'
---

![arrested for opengl crimes](arrested-for-opengl-crimes-full.png)

<!-- truncate -->

These are my findings over the months and years of exposing myself to OpenGL. I hope it helps someone. 

The OpenGL specification is mentioned several times throughout the article, it can be found [here](https://registry.khronos.org/OpenGL/specs/gl/glspec46.core.pdf).

### First things to do

Install [RenderDoc](https://renderdoc.org). If you have not read its getting-started, read it before anything else.
There is also a plugin called [Where is my Draw?](https://github.com/baldurk/renderdoc-contrib/blob/main/baldurk/whereismydraw/README.md) — install it by following the instructions [on the official repo](https://github.com/baldurk/renderdoc-contrib/tree/main).

Set up `glDebugMessageCallback`. See [here](https://deccer.github.io/OpenGL-Getting-Started/02-debugging/02-debug-callback/) for example code.

If you use `glGetError` with or without macros like `GLCALL` or `GLCHECK`, or you rolled your own error checking functions, get rid of them. `glDebugMessageCallback` will replace them, while avoiding any subtle bugs that may have been caused by error checking copy-paste.

Always check that both shader compilation *and* linking were successful. Search for `glGetShaderiv` and `glGetProgramiv` for more on compile and link status.

### If you are on a Mac

Please port your application to Metal or WebGPU at least, seriously. There is no support for `KHR_debug` and you cannot use anything newer than OpenGL 4.1. That is enough reason to not want to use OpenGL on a Mac. If you insist on using a Mac, stay with OpenGL 3.3.

You are getting `UNSUPPORTED (log once): POSSIBLE ISSUE: unit 0 GLD_TEXTURE_INDEX_2D is unloadable and bound to sampler type (Float) - using zero texture because texture unloadable`. You need to call `glGenerateMipmap(GL_TEXTURE_2D)` after `glTexImage2D()` or set max level to 0 if you don't need or want mips.

### RenderDoc is crashing when trying to run your application

There is a high chance something in the application's code is fishy. Use a debugger or code-sanitizer to figure out what is going on in your application. Most likely some problem with memory allocation, freeing or some kind of UB.

Another reason why RenderDoc is crashing is that it doesn't like certain extensions you might be using in your code. RenderDoc used to tell you and not just
crash, but that behaviour has changed since 1.36 or so. But what you can do is check your code for things involving bindless textures, and bindless buffers. Stuff like `glMakeTextureResidentARB`, `glProgramUniform...64NV`, `glGetTextureHandleARB`.

RenderDoc also does not support legacy OpenGL. Make sure you aren't using `glVertexXy`, `glNormalXy` etc. To debug old school stuff, use apitrace or nVidia's NSight Graphics.
Older versions of gEDebugger or CodeXL might work too.

### You use GLAD but it is giving you a hard time about symbols not being found, about multiple definitions, or other similar errors

It is most likely that the headers you are using are just outdated. Regenerate the header on [dav1d's site](https://glad.dav1d.de/), or check that your build system is pulling a recent version of glad.

### Debug callback says

- `GL_INVALID_OPERATION error generated. Array object is not active.`

  You didn't bind a VAO. Core Context OpenGL requires a VAO bound at all times.

### Shader compiler log says

- `function "main" is already defined`
  
  You probably compile your fragment shader as vertex shader or the other way around.

### You are unable to figure out if an extension is supported

- `GL_NV_conservative_raster` for example, despite calling `glGetString(GL_EXTENSIONS)`
  
  You either need to query extensions with a forward compatible context or switch to query `GL_NUM_EXTENSIONS` first and then iterate over all of them with `glGetStringi` and then check if the extension is part of that list. The latter requires a core OpenGL context.

### Exception when calling glDrawElements a.k.a. "0xC0000005"

You most likely have no index buffer bound, or it is not associated with the current VAO.

### Exception when calling glDrawArrays or worse, the driver is crashing

- You're probably drawing more primitives than you have in your vertex buffer, check the arguments of your `glDrawArrays` call.
- You might have not set the vertex count variable and as a result it contains an uninitialized value, assuming you used a language like C or C++.

### Textures/Triangles are black

Did you forget to bind the texture in question?

If you are using `glTexImageXX`, make sure the texture is complete. Check with the OpenGL Specification what completeness entails.

If it was not complete it should have told you about it in the debug callback. **Shame on you** if you still have not set it up :)

You might be using sampler objects. Make sure you bind one.

You might be sampling from a corner of your texture where it's actually black, check your UVs.

Check that your VAO setup is correct. Make sure stride, offset are set correctly. And if you are using multiple vertex buffers for all your attributes, make sure
they are bound properly.

You tried to use vertex colors, but you didn't setup the VAO properly.

Vertex colors might just be black. If it wasn't intentional, check the contents of your VBO.

### Screen is Black

- Check if your screen is on/connected properly
- Make sure your clear color is not pure black
- Camera is not looking at the scene in question (projection and/or view matrices are wrong)
- No texture is sampled due to missing or wrong uvs => default value is most likely 0, meaning black (the value depends on the driver)
- No shader bound (especially fragment shader)
- Fragment shader doesn't write anything to its output
- No viewport is set, or it is too small
- You might be rendering to a framebuffer, but not using it in a way that lets you see its contents like blitting it to the default framebuffer.
- Are you rendering to multiple render targets?

  If you are, check that you called the right `gl(Named)DrawBuffers`. Check that you didn't call `gl(Named)DrawBuffer`, once per render target.
- Are you playing with depth-pre-pass-isms?

  Make sure the gl state between passes is the same, face winding, cull mode, etc. See Appendix A.3 in the gl spec for more clues about invariance.
- Check winding order and cull mode, you might be looking at the wrong side of your faces
- You checked RenderDoc and wonder why the vertex list contains the same (perhaps even first element) only, for all vertices. Make sure your `glDrawElements(..., ..., GL_UNSIGNED_INT, ...)` or whatever datatype your indexbuffer consists of matches that parameter.
- Perhaps you are trying to read an int/uint or long/ulong value from your vertex attribute. Double check that you called the right `glVertexAttrib`**`X`**`Pointer` when setting up your VAO.

All these things can be checked with a graphics debugger of your choice.

### Textures look funny, like a garbled version of the actual image

Make sure your internal format and actual pixel format match.
You probably used stb_image to load, but used 0 as the last parameter, and pixel data has 3 components, instead of the 4 (`GL_RGBA`) you told OpenGL about.
Request 4 channels from stb_image. There is almost never a reason to request 3 or fewer channels for textures with color data.

### Textures look like one color component is more prominent than others

- Colors are more shifted towards blue
  
  - Original pixel data was probably in `RGB` but you asked for `GL_BRG` or some other non-matching format => make sure they match

- Colors are more shifted towards red

  - Original pixel data was probably in `BGR` but you asked for `GL_RGB` or some other non-matching format => make sure they match

### Textures seem to work, but the mesh also appears to be shaded weirdly as if its in some black fog

Did you generate mipmaps?

### Render artifacts like small missing tiles on a floor

Very likely an alignment issue. Check the alignment rules in the GLSL Specification.

Other reasons could be that you are binding multiple textures to the same slot/unit. Check your `glBindTextureUnit` calls and if you are stuck in non-DSA land,
check your `glBindTexture/glActiveTexture/glUniform1f` combinations.

Another classic reason is not using a flat index when indexing into material buffers or texture arrays. 

  ```glsl
  layout(location = n) flat int in v_material_index;
  ```

Synchronization issues could be yet another reason. Perhaps a missing `glMemoryBarrier` at the right spot.

### Depth buffer not cleared despite calling `glClear(GL_DEPTH_BUFFER_BIT)`

Check if `glDepthMask` was set to `GL_FALSE`. When using FBOs, use `glClearNamedFramebuffer()` (it still requires `glDepthMask` to be set properly)

### Weird "Z-Fighting"

- Check your depth buffer, near, and far planes. Try near `0.1f` and `512/1024` as far plane.
- Your depth buffer might be too small and is set to `D16` only, set it to something `D24` or `D32`.
- You use SDL2 and on your platform the default might be set to `D16`, find the `SDL2_GL_Set_Attribute` which sets the depth bits for the default FBO.

### P.S.

`RenderDoc` is not a profiler, the frametimes you see reported there are not really usable. Use an actual GPU profiler like NSight Graphics. NVidia provides downloads for older versions as well, in case you have an older GPU. You just dont get the latest bling features with them.

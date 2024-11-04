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

Those were my findings over the months and years of exposing myself to OpenGL. I hope it helps anyone.

### First Things To Do

Hook up [RenderDoc](https://renderdoc.org). If you have not read its getting-started, read it before anything else.
There is also a plugin available "Where is my drawcall" hook it up by following the instructions on RenderDoc's site.

Setup `glDebugMessageCallback` see [here](https://deccer.github.io/OpenGL-Getting-Started/02-debugging/02-debug-callback/) for example code.

If you use `glGetError` with or without macros like `GLCALL` or `GLCHECK` or rolled your own, get rid of it. `glDebugMessageCallback` will replace those. There is a high chance that you used it incorrectly anyway because you copy pasted it from some questionable source. 

Make sure you check that shader compilation *and* linking was successful. See `glGetShaderiv` & `glGetProgramiv` on compile and link status.

### You are on a Mac

Please port your engine to `metal` or `webgpu` at least, seriously. There is no support for `KHR_debug` and you cannot use anything > gl 4.1. That is enough reason

You are getting `UNSUPPORTED (log once): POSSIBLE ISSUE: unit 0 GLD_TEXTURE_INDEX_2D is unloadable and bound to sampler type (Float) - using zero texture because texture unloadable`. You need to call glGenerateMipmap(GL_TEXTURE_2D) after glTexImage2D() or set max level to 0 if you dont need/want mips.

If you insist on using Mac, stay with OpenGL 3.3.

### RenderDoc is crashing when trying to run your application

This is most likely **not** RenderDoc's fault, but yours. Something in your code is fishy and RenderDoc doesnt like it. Use a debugger/code-sanitizer to figure out
what is going on in your application. Most likely some problem around memory allocation/freeing/UB related thing.

Another reason why RenderDoc is crashing is that it doesnt like certain extensions you might be using in your code. RenderDoc used to tell you usually and not just
crash, but that behaviour has changed since 1.36 or so. I don't know why. I have not bothered asking baldur yet. But what you can do is check your code for
things involving bindless textures, and bindless buffers. Stuff like `glMakeTextureResidentARB`, `glProgramUniform...64NV`, `glGetTextureHandleARB`. RenderDoc also does
not support legacy OpenGL. Make sure you arent using those either `glVertexXy`, `glNormalXy` etc. To debug old school stuff, use `apitrace` or nVidia's NSight Graphics.
Older versions of `gEDebugger` or `CodeXL` might work too.

### You use GLAD but it is giving you a hard time about symbols not found and multiple definitions or the likes

It is most likely that the headers you are using are just outdated. Regenerate the header on dav1d's site. Or check your build system that it is
pulling a recent version of glad.

### Debug Callback Says

- `GL_INVALID_OPERATION error generated. Array object is not active.`:
  You didn't bind a VAO. Core Context OpenGL requires a VAO bound at all times. Bind one.

### Shader Compiler Log Says

- `function "main" is already defined`
  You probably compile your fragment shader as vertex shader or other way around

### You are unable to figure out if an extension is supported

`GL_NV_conservative_raster` for example despite calling `glGetString(GL_EXTENSIONS)` and all that.
You either need to query extensions with a forward compatible context or you switch to query `GL_NUM_EXTENSIONS` first and
then iterate over all of them with `glGetStringi` and then check if the extension is part of that list. The latter requires a core OpenGL context.

### Exception when calling glDrawElements - aka "0xC0000005"

You most likely have no indexbuffer is bound. Or it is not associated to/with the current VAO.

### Exception when calling glDrawArrays / or worse the driver is crashing

You probably want to draw more primitives than you have in your vertexbuffer, check arguments of your `glDrawArrays` call.
Potentially you might not have set the vertex count variable and that contains an ununitialized value because you used c/c++ and are a doofus.

### Textures/Triangles are black

Did you forget to bind the texture in question?

When you are not using `glXXXTextureStorage` but not good and old `glTexImageXX` make sure the texture is complete.
**Check** with **OpenGL Specification** what completeness entails.

If it was not complete it should have told you about it in the debug callback. **Shame on you** if you still have not set it up.

You might be using sampler objects. Make sure you bind one.

You might be sampling from a corner of your texture where its actually black, Check your UVs.

Another very likely reason is you didn't understand VAOs and copy pastaed it from learnopengl and added your own twist to it.
Check that your VAO setup is correct. Make sure stride, offset is set correctly. And if you are using multiple vertexbuffers for all your attributes, make sure
they are bound properly.

You tried to use vertex colors, but you didn't setup the VAO properly.
Vertex colors might just be black. If it wasn't intentional, check the contents of your VBO.

### Screen is Black

- Check if your screen is on/connected properly
- Camera (projection/view matrices are fucked) is not looking at the scene in question
- No texture is sampled due to missing or wrong uvs => default value is 0 aka black (depends on the driver)
- No shader bound (especially fragment shader)
- Fragment shader doesnt write anything to its output
- No viewport is set/is too small
- you might be rendering to a framebuffer, but not blitting that framebuffer to the default one or using it in a way to see its contents.
- Let clearcolor be something else than pure black
- are you rendering to multiple render targets?
  - if yes, check that you called the right `gl(Named)DrawBuffers`. Check that you didnt call `gl(Named)DrawBuffer` once per render target.
- are you playing with depth-pre-pass-isms?
  - make sure the gl state between passes is the same, face winding, cullmode, etc. See Appending A.3 in the gl spec for more clues about invariance.
- check winding order and cullmode, you might be looking at the wrong side of your faces
- you check renderdoc and wonder why the vertex list contains the same (perhaps even first element) only, for all vertices. Make sure your `glDrawElements(..., ..., GL_UNSIGNED_INT, ...)` or whatever datatype your indexbuffer consists of matches that parameter
- Perhaps you are trying to read an int/uint or long/ulong value from your vertex attribute. Get some glasses and double check that you called the right `glVertexAttrib`**`X`**`Pointer` when setting up your VAO.

All these things can be checked with a graphics debugger of your choice.

### Textures look funny, like a garbled version of the actual image

Make sure your internalformat and actual pixel format match.
You probably used stb_image to load, but used 0 as the last parameter, and pixel data has 3 components, instead of the 4 (GL_RGBA) you told OpenGL about.
Request 4 channels from stb_image. There is almost never a reason to request 3 or less channels for color bearing pixelmaps.

### Textures look like one color component is more prominent than others

Happens when you are used to DirectXisms

- Colors are more shifted towards blue
  
  - You probably messed up the format and asked for GL_BRG.. of sorts => make sure they match

- Colors are more shifted towards red

  - Original pixeldata was probably in BGR... but you asked for GL_RGB... of sorts => make sure they match

### Textures seem to work, but the mesh also appears to be shaded weirdly as if its in some black fog

Did you generate mipmaps?

### Render artifacts like small missing tiles on a floor

VERY likely an alignment issue. **Check** the alignment rules in the **GLSL Specification**.

Other reasons could be that you are binding multiple textures to the same slot/unit. Check your `glBindTextureUnit` calls and if you are stuck in non DSA land,
check your `glBindTexture/glActiveTexture/glUniform1f` combinations.

Another classic is not using a flat index when indexing into material buffers or texture arrays. 

  ```glsl
  layout(location = n) flat int in v_material_index;
  ```

Synchronization issues could be yet another reason. Perhaps a missing `glMemoryBarrier` at the right spot.

### Depth buffer not cleared

- Despite calling `glClear(GL_DEPTH_BUFFER_BIT)` => check if `glDepthMask` was set to `GL_FALSE`. When you use FBOs migrate to glClearNamedFramebuffer() if you havent already (still requires glDepthMask set properly)

### Weird "Z-Fighting"

- check your depth buffer, near and far planes... try near 0.1f and 512/1024 as farplane
- your depth buffer might be too small and is set to D16 only, set it to something D24 or D32
- you use SDL2 and on your platform the default might be set to D16, find the SDL2_GL_Set_Attribute which sets the depth bits for the default fbo

### PS

`RenderDoc` is not a profiler, the frametimes you see reported there are not really usable. Use an actual gpu profiler like `NSight Graphics`. I hear you complain already
that Version YYYY.XX doesnt support your potato GPU. NVidia provides downloads for older versions as well, you just dont get the latest bling features with it.

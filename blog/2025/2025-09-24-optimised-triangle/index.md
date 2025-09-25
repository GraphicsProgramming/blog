---
title: 'help! my triangle is only 300fps!!!'
slug: 'optimised-triangle'
date: '2025-09-24'
authors: ['jaked', 'eduameli']
tags: ['faq', 'article']
---  

Don't worry! your triangle running at a mere 300 fps is perfectly normal. The purpose of this post is to try to convince you it is not
a good use of your time to try to optimise hello-triangle.

- 300fps is still pretty fast! ~3.33ms 

- FPS can be a misleading performance metric, as it changes non-linearly as you optimise your frame.
  A 10fps difference from 60 to 70fps is ~2.38ms while the difference from 300 to 310fps is ~0.107ms.
  To actually profile your application it is much better to use dedicated tools like [Nsight Graphics](https://docs.nvidia.com/nsight-graphics/UserGuide/) or [Tracy](https://github.com/wolfpld/tracy).

- Modern GPUs are very complex, and performance **does not scale linearly with scene complexity**, for example, if one triangle runs at 300fps this doesnt mean five triangles will run at 60fps.
  GPUs are designed to have really good throughput at the cost of latency.

- When rendering one single triangle, most of your frametime may just be **overhead**, this could be your window manager, driver or API state validation to name a few.

- **hello-triangle** is simply not a representative workload for _real applications_, which are way more complex with lots of factors affecting performance and a **compromise between speed and
  quality**. In order to properly judge the performance of your engine, you should at least use a test scene such as [Intel Sponza](https://www.intel.com/content/www/us/en/developer/topic-technology/graphics-research/samples.html) or
  [Bistro](https://developer.nvidia.com/orca/amazon-lumberyard-bistro).

Good luck on your journey learning graphics!

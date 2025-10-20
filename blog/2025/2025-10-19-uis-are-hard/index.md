---
title: 'UIs Are Hard'
slug: 'uis-are-hard'
description: 'An explanation of the custom UI in the Twin Gods engine'
date: '2025-10-19'
authors: ['domiran']
tags: ['ui', 'opengl', 'article']
image: 'ui-overview.png'
---
If you're like me, you've thought to yourself at least once: "Hey, making a UI can't be that hard! I wouldn't need to add any more headers or libraries to my project!" Because not having to deal with C++ is a good reason to write your own UI. Well, I did it. What came out the other end is a confusing mixture of knowledge, a lot of head-bashing, years of code that went sideways more than once, and a working UI for a functioning game. Let's see how it works, shall we?

This is not an article to sell you on using my UI ([\*0](#note-id-0)). This is only intended as a showcase of how it works, *why* it works that way, what went into making it, and how difficult it is to make a UI from scratch. And I cannot understate how difficult it is -- *and how much time it takes* -- to make a UI from scratch.

In this article, we'll cover:

1. Defining a UI element with a simple example
2. How materials are defined
3. How text and color styles are defined
4. The template system
5. How this all helped shape the look of the game's UI

<!-- truncate -->

Other topics, such as data binding (don't be fooled by this only being two words, this is *type-checked* on game startup), callbacks, the click feedback system, the dialog transition system, text rendering (which, [hates you](https://faultlore.com/blah/text-hates-you/)), the UI loader (a rather vital part), the lame UI editor, the script wait system, the UI flow and layout system, how the UI is rendered, the "vis stack" (again, don't be fooled by it only being two words), dialog navigation (yep), the UI event system, lists, the placeholder text system, and how the data is actually organized engine-side will be left to future articles.

![Menu Overview](ui-overview.png)

## But First

I will be blunt: I will neither encourage nor discourage you from using the general paradigm used by Twin Gods' UI. This is only one man's journey from an empty code file to a fully-featured UI that could actually be used in a professional video game. And let me tell you, I'm as surprised as you are.

A few names. Twin Gods' engine is dubbed **Hauntlet**. The UI library has no name so we'll refer to it as "Twin Gods UI", or "TGUI" (because I think HUI sounds silly). Like all the rest of Hauntlet, it is in C++ and is rendered with OpenGL 4.6.

## Let's Begin

Let's see how it all started.

![How It Began](how-it-started.png)

Rough, eh? That screenshot is dated 2011. Nevermind the hilarious artwork, how did TGUI go from a fever dream to something someone might not actually downvote on Steam out of sheer anger?

The basics of TGUI have not changed since 2011 ([\*1](#note-id-1)). The main workhorse is a class called `DialogItem`. TGUI has no "controls" as you'd expect of a UI library, which is a relic from its early days as a "I didn't know what I was doing" sort of thing ([\*2](#note-id-2)). Every UI element is a `DialogItem`. `DialogItem` contains a `std::vector<DialogItem>` member. If I remember right, the original version contained only the very basics: support for a background image, on-click event, text, child elements, and the layout type (row, column, pure x/y). It also used to support drag and drop. Implement *that* at your own peril.

It's gotten more complicated since and, you'll be happy to know, the concept of controls has emerged, though not through the C++ side of things. We'll get to that in later articles. This means that every UI element contains all the attributes used to make up everything seen in the UI. `DialogItem` is reported as being 1,480 bytes in release mode. It's quite large.

But of course, the definition of a TGUI `UIFrame` is just as important as the engine code behind it. TGUI's XML might as well be its own language and is one of its primary strengths, I think.

Ok, I lied. There is one specific control: lists. For a later article.

## Eww, XML!

All screenshots in this article were captured from the running game.

Here's a simple example UIFrame.

```xml
<UIFrame Name="simple-example" Size="250,50" Anchor="Center" BackColor="White" Background=";materials\unit speech frame.mat">
    <Node Name="downbox-1" BackColor="Blue" Text="Hello!" FontStyle="Paragraph-Normal16" />
</UIFrame>
```

That XML produces this UI.

![Simple Example](simple-example.png)

Much of the XML should be self-explanatory but let's cover a few less-obvious points.

* `BackColor` is applied on top of any materials.

* The astute reader may note the `;` hanging out in front of the `Background` attribute. For better or worse TGUI's XML reflects its history, a problem you run into when your code is over a decade old ([\*3](#note-id-3)). The semicolon denotes a material file. `Background="plain texture.png"` would specify a texture directly. A "material" is simply a texture and shader with values for uniforms. Materials came much later. Very recently, in fact.

* `Anchor` is a note to the layout and flow code. It determines the initial position of the dialog. "Center" simply means it is laid out in the middle of its parent. Other options are "TopLeft", "Top", "TopRight", etc. 

* `Name` is how the frame is referred to in code and via any scripts (in Lua).

From the beginning, TGUI used XML ([\*4](#note-id-4)). Much has been added but the basic file format has not changed much in the past 13 years. The entire UI is defined in a single file, "UI Frames.xml".

## High-Level Storage Concept

An aside on data.

Due to the class names on the engine side, I tend to refer to any "UI element" as a "dialog", which corresponds to the `DialogItem` class. The above XML produces 2 dialogs (or `DialogItem`s): the top-level "UIFrame" node and the "Node" node. The entire `DialogItem` tree is then stuffed into a `UIFrame` object and stored in a list: `std::vector<UIFrame> UIFrames`. I may also refer to a "UI frame" more casually in-game (say, to non-technical players) as a "window" or "screen".

It's important to note that a `UIFrame` is single-instance. Once loaded, the engine does not duplicate or create a new instance of any of these objects when they are displayed in-game. The tree is never touched after load. The whole tree of a `UIFrame` is displayed at once, barring any dialogs that are set invisible. This `UIFrames` (note the "s") list has the same lifetime as the running game. At a basic level, this `UIFrame` object is a fancy container for a single UI tree with additional properties left for future articles.

Obviously, even though the *tree* is essentially read-only, the actual `DialogItem`s are written to quite frequently, especially during data binding.

Note that each `UIFrame` in the XML file *can* be stored in a variable for use in code (data binding, showing windows to the player, etc.). All `UIFrame`s *do* exist in the UIFrames *list* (or they could not be found otherwise) but many important `UIFrame`s also have a hard variable in the engine for direct reference in code (eg, `UIFrames().simple_example.show()`).

## Materials

Here's the definition of the material used above ([\*5](#note-id-5)):

```xml title="materials\unit speech frame.mat"
<material texture="textures\ui\unit speech.sliced.png" shader="shaders\ui\dialog9SliceGradient4.shader">
    <uniform name="colorTopLeft" type="color" value="DialogGradientVeryLight" />
    <uniform name="colorTopRight" type="color" value="DialogGradientVeryLight" />
    <uniform name="colorBottomLeft" type="color" value="MediumDarkBlue" />
    <uniform name="colorBottomRight" type="color" value="VeryDarkGray" />
    <uniform name="colorBorder" type="color" value="DialogBorder" />
</material>
```

I won't show the shader but it is a basic "9-slice" shader with suport for coloring at the 4 corners and a border color, hence the 5 uniforms. **It cannot be overstated how important materials were to the look of Twin Gods' UI, and the ease of development.** The screenshot shown in the top of the article represents the third major "rewrite" of the UI.

More on how this helped a little later.

## UI Styles

You'll notice in the material definition that there is are `color` attributes not set to any colors you know. `value` can be set to a hex color starting with a "#", or it can be set to a named color defined in the "UI Styles" file. "UI Styles.xml" is a lovely companion piece to "UI Frames.xml".

It can define colors:

```xml
<Color Name="OffWhite" Color="#FBFBE8FF" />
<Color Name="VeryDarkGreen" Red="0" Green="0.3" Blue="0" Alpha="1" />
```
Why both ways? A decade of legacy cruft (and, importantly, laziness).

It can also define fonts.

```xml
<FontStyle Name="Unit-Damage-Crit" LineHeight="8" Font="short\16-outline" Color="White" Outline="VeryDarkRed" Align-Horiz="Center" Shader="shaders\font\font-bounce.shader" />
<FontStyle Name="UnitBlock" Font="tall\16" Color="White" Outline="MediumDarkBlue" DropShadow="1,1" />
```

It can even define the prefix folder used to determine where to pull fonts from because I'm lazy and haven't updated the `Font` attribute to work like literally every other in-game asset after the last `FileSystem` refactor.

```xml
<FontStyles FontPrefix="fonts\nope">
```

You'll notice on the UIFrame XML definition that there was `FontStyle` attribute, which makes it look like each dialog only supports a single.

![I Assure You](assure-you.png)

Text format style will be covered in a later article.

In any case, the "UI Styles" file is a vague CSS-like system, any by CSS I mean I can specify color, font face, font size, shader, outline, and a few other things and that's basically it.

I should note before anyone gets mad that if `DropShadow` appears in a `FontStyle`, the `Outline` color becomes the drop shadow color. 13 years of *cruft*!

## Templates, In My UI?

One of the more interesting features, I think, is TGUI's template capability. This is why TGUI will probably never get official support for controls. Brace yourself, the XML only gets uglier from here.

```xml
<Template Name="test-field" BackColor="White">
  <Node Name="label" FontStyle="Short-Normal16" />
  <Node Name="value" FontStyle="Paragraph-Highlight16" />
</Template>

<UIFrame Name="tester2" Size="250,50" Anchor="Center" BackColor="White" Background=";materials\unit speech frame.mat">
  <DownBox>
    <AcrossBox:test-field label:Text="Yaw" value:Text="No degrees." BackColor="Red" />
    <AcrossBox:test-field label:Text="Pitch" value:Text="Completely invalid." />
  </DownBox>
</UIFrame>
```

The above XML produces this:

![Templated Fields](template-stuff.png)

I said earlier the engine treats the UI tree as essentially read-only, right? So what happened? The template system happened, that's what.

Before that, quickly, `DownBox` flows all child dialogs as rows and `AcrossBox` flows all child dialogs as columns. `Node` is expected to have no children, applies no flow, and is basically undefined behavior if you try it. (`Node` is mostly symbolic; you can absolutely have `DownBox` as a leaf.)

## How Templates Expand

When the UI loader encounters a `Template` node, it is put aside into a separate "templates" list, noting the name, and moves on to the next top-level node. When it encounters an XML node of the name format `ValidNodeType:TemplateName`, the template system kicks in, and it's rather simple (in theory).

The previously-set-aside node now acts like it was copied and pasted in-place.

This XML:

```xml
<AcrossBox:test-field label:Text="Yaw" value:Text="No degrees." BackColor="Red" />
```

Is expanded to become:

```xml
<AcrossBox Name="test-field" BackColor="Red">
  <Node Name="label" Text="Yaw" FontStyle="Short-Normal16" />
  <Node Name="value" Text="No degrees." FontStyle="Paragraph-Highlight16" />
</AcrossBox>
```

`AcrossBox:test-field` pulls the XML for `test-field`, copying and pasting it and all its child nodes on top of the `AcrossBox` node, as if `AcrossBox` is the same node as the `Template` top-level node. To make this last point more clear: `BackColor="Red"` (which visually does nothing here), overwrites `BackColor="White"` (also does nothing).

### Templated Attribute Resolution

The template parser sees the same attribute (`BackColor`, in this case) on the same node, post-parse, as the top-level `Template` node and overwrites the template's attribute with the incoming real node. On the second `AcrossBox`, the template's original `BackColor="White"` stays because the incoming real node has no such attribute.

### Template Attribute Expansion Assignment

What about `label:Text` and `value:Text`? The syntax may be cursed but I could not live without this feature. It searches down the tree (depth only) until it finds a dialog with the given name and then sets the given attribute. This is part of the "grand success" of how templates work. Data binding abuses this whole-heartedly and quite literally makes some features possible.

### Improve the Look With Templates

Getting back to our example, it still looks a little weird. The label is not a fixed size. We can make this a little better without putting a size everywhere. More XML.

```xml
<Template Name="test-label" Width="48" FontStyle="Short-Normal16" />

<Template Name="test-field" BackColor="White">
  <Node:test-label Name="label" />
  <Node Name="value" FontStyle="Paragraph-Highlight16" />
</Template>

<UIFrame Name="tester2" Size="250,50" Anchor="Center" BackColor="White" Background=";materials\unit speech frame.mat">
  <DownBox>
    <AcrossBox:test-field label:Text="Yaw" value:Text="No degrees." />
    <AcrossBox:test-field label:Text="Pitch" value:Text="Completely invalid." />
  </DownBox>
</UIFrame>
```

Yep, templates can have templates. I heard you like templates so I put a template in your template. The result:

![Template Fields 2](template-stuff-2.png)

But we can do a little better, still. Let's remove the width, letting the flow system do all the work. We'll set a margin, add a texture, and some more fixed widths.

```xml
<Template Name="test-label" Width="48" FontStyle="Short-Normal16" />
<Template Name="test-field" FontStyle="Paragraph-Highlight16" />

<Template Name="test-combo" BackColor="White" InnerMargin="2,2,2,2" Width="160" Background=";materials\affinity box empty.mat">
  <Node:test-label Name="label" />
  <Node Name="value" FontStyle="Paragraph-Highlight16" />
</Template>

<UIFrame Name="tester2" Anchor="Center" BackColor="White" Background=";materials\unit speech frame.mat" InnerMargin="2,2,2,2">
  <DownBox>
    <AcrossBox:test-combo label:Text="Yaw" value:Text="No degrees." />
    <Node Height="1" />
    <AcrossBox:test-combo label:Text="Pitch" value:Text="Completely invalid." />
  </DownBox>
</UIFrame>
```

![Template Fields 3](template-stuff-3.png)

There. It won't win any awards but it's a fine example of what TGUI's template system can do. It also does illustrate one of TGUI's limitations: the flow and layout code has no way to set a "minimum expanding" width. If the "label" text expanded past the width of "test-combo", it would simply extend past the frame and look weird.

![Layout Whoops](layout-whoops.png)

We'll save the problem of creating a UI/text flow/layout system for another day. Let's finish up by just seeing how this all helped shape TGUI's look.

## Shaping the Look of Twin Gods' UI

Where we've been and where we are.

![TGUI Mark 2](ui-mark-2.png) ![TGUI Mark 3](ui-mark-3.png)

The first picture is "version 2" of the Twin Gods UI. The second picture is obviously the current iteration. Apart from the difference in navigation, note the *drastic* difference in coloration. One of Hauntlet's hallmark features as a dev tool is its in-game console. All UI-related data can be hot-reloaded in-game. *It cannot be understated* how important *fast iteration* is to game development in general. Being able to edit a file and see the result in-game immediately is *fabulous*. Hauntlet has a UI editor but nothing beats real data *and* being able to navigate it.

Materials were kind of revolutionary in the look of TGUI primarily because I could now apply colors. You might not know this but I'm rather bad when it comes to graphic design. However, I *eventually* realized one of the many reasons the older UI designs looked rather drab is because they lacked any kind of *texture* (in addition to their lack of contrast). I don't just mean tgas or pngs or jpgs. I mean variance. There are gradients all over the current UI iteration. There are borders. There is contrast. This may be a no-brainer to any of you experienced in UI design and you may be wondering, if I could hot-reload *all* UI data, why was it not enough to hot-reload textures and that `BackColor` attribute? Because now I could play with color schemes at large and ***quickly*** change everything in the UI with just a few edits in "UI Styles.xml". Combine this with the gradient support, and now I could quickly make colorful, pleasing patterns to splash across the screen.

For a long time, the template system was just a way to avoid simply copy/pasting large structures in "UI Frames.xml". Remember that opening screenshot?

![Menu Overview](ui-overview.png)

Wanna see the XML that makes up the "unit frames"? Well, too bad.

```xml
<Template Name="GameMenu.UnitFrame">
  <FrameRow InnerMargin="0,2,0,0">
    <FrameCell Flowable="False" Size="21,16" InnerMargin="0,0,0,0">
      <FrameRow Flowable="False" Offset="3,0" Bind="Party.Unit.Portrait" Size="21,16" />
    </FrameCell>
    <FrameCell Offset="2,4">
      <FrameRow>
        <FrameCell Flowable="False" Size="257,1" Offset="0,12" BackColor="LightGray" Background=";materials\item separator.mat" />
        <FrameCell Offset="26,0" Bind="Party.Unit.Name" BackColor="DarkGray" Text="{}" FontStyle="Paragraph-Normal16" />
      </FrameRow>
      <FrameRow Flowable="False" Width="257" HAlign="Right" Offset="0,-10">
        <FrameCell Text="{}" Bind="Party.Unit.Class" FontStyle="Short-Normal16" />
        <FrameCell Text=", Level " FontStyle="Short-Normal16" />
        <FrameCell Text="{}" Bind="Party.Unit.Level" FontStyle="Header-Normal16" />
      </FrameRow>

      <FrameRow InnerMargin="3,1,1,0">

        <FrameCell>
          <FrameRow Width="100%" InnerMargin="1,0,2,0">
            <FrameCell Text="[color:VeryLightRed] HP[/color]" Bind="Party.Unit.HP.Current" FontStyle="Micro-Normal16" />
            <FrameCell>
              <FrameRow Width="67" HAlign="Right">
                <FrameCell Text="[color:VeryLightRed]{}[/color]" Bind="Party.Unit.HP.Current" FontStyle="Paragraph-Normal16" />
                <FrameCell Text=" / " FontStyle="Micro-Normal16" Offset="0,-1" />
                <FrameCell Text="[color:VeryLightRed]{}[/color]" Bind="Party.Unit.HP.Max" FontStyle="Micro-Normal16" />
              </FrameRow>
            </FrameCell>
          </FrameRow>
          <FrameRow Background=";materials\white.mat" BackColor="ExtremelyDarkGray" Size="82,3">
            <FrameCell Offset="1,1" Background=";materials\white.mat" BackColor="LightRed" Size="80,1" Bind="Party.Unit.HP.Percent" />
          </FrameRow>
        </FrameCell>

        <FrameCell Width="5" />

        <FrameCell>
          <FrameRow Width="100%" InnerMargin="1,0,2,0">
            <FrameCell Text="[color:VeryLightBlue] MP[/color]" Bind="Party.Unit.HP.Current" FontStyle="Micro-Normal16" />
            <FrameCell>
              <FrameRow Width="67" HAlign="Right">
                <FrameCell Text="[color:VeryLightBlue]{}[/color]" Bind="Party.Unit.MP.Current" FontStyle="Paragraph-Normal16" />
                <FrameCell Text=" / " FontStyle="Micro-Normal16" Offset="0,-1" />
                <FrameCell Text="[color:VeryLightBlue]{}[/color]" Bind="Party.Unit.MP.Max" FontStyle="Micro-Normal16" />
              </FrameRow>
            </FrameCell>
          </FrameRow>
          <FrameRow Background=";materials\white.mat" BackColor="ExtremelyDarkGray" Size="82,3">
            <FrameCell Offset="1,1" Background=";materials\white.mat" BackColor="LightBlue" Size="80,1" Bind="Party.Unit.MP.Percent" />
          </FrameRow>
        </FrameCell>

        <FrameCell Width="5" />

        <FrameCell>
          <FrameRow Width="100%" InnerMargin="1,0,2,0">
            <FrameCell Text="[color:VeryLightGreen] XP[/color]" Bind="Party.Unit.HP.Current" FontStyle="Micro-Normal16" />
            <FrameCell>
              <FrameRow Width="67" HAlign="Right">
                <FrameCell Text="[color:VeryLightGreen]{}[/color]" Bind="Party.Unit.Exp.Remaining" FontStyle="Paragraph-Normal16" />
              </FrameRow>
            </FrameCell>
          </FrameRow>
          <FrameRow Background=";materials\white.mat" BackColor="ExtremelyDarkGray" Size="82,3">
            <FrameCell Offset="1,1" Background=";materials\white.mat" BackColor="LightGreen" Size="80,1" Bind="Party.Unit.Exp.Percent" />
          </FrameRow>
        </FrameCell>
      </FrameRow>

      <FrameRow Offset="1,1" List="8,1" ListIconSize="Small" ListItemSpacing="2,0" Bind="Party.Unit.Buff" OnMouseOver="Tooltip.Buff.Show" OnMouseOut="Tooltip.Buff.Hide" List-Item-Size="18,18" ListIconOffset="1,1" Background=";materials\affinity box.mat" FontStyle="Short-Normal16" />
    </FrameCell>
  </FrameRow>
</Template>
```

The template system becomes rather mandatory.

## Notes

#### (0) {#note-id-0}
Though I may be trying to sell you on buying a copy of Twin Gods.

#### (1) {#note-id-1}
Hauntlet has not been in active development since 2011. For a long time, it was an on-again-off-again project.

#### (2) {#note-id-2}
Arguably, still don't. 

#### (3) {#note-id-3}
Somehow, TGUI has survived every massive refactor in Hauntlet, and not for lack of trying. There is a *large* comment inside the `DialogItem` class about introducing official UI element control types. (At this point, it will never get done.)

#### (4) {#note-id-4}
Fun fact: the original version of TGUI's definition file could be lightly edited to view in a web browser. This was how the initial UI was created.

#### (5) {#note-id-5}
Astute readers will note the difference in casing between the TGUI data and material data. You can always tell an older file format in Hauntlet because they use CamcelCase. Newer files use kebab-case.

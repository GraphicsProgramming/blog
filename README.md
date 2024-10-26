# blog

The Graphics Programming Blog - A collection of technical articles, project posts and show cases.

## Things which work
- You can create articles and project posts

## Things which don't work yet
- Search
- Show case is not thought through yet.

## How to get started
- Fork the repo
- Clone your fork
- Write the technical article or project post by placing the file in the right directory inside blog/

  I think a good folder structure is the following

  a folder per year and inside a folder with a timestamp in form of yyyy-MM-dd and a short description of your blog entry, perhaps the slug of your post

  `yyyy/yyyy-MM-dd-short-description/index.md`

  index.md will be your main entry point and you can put whatever accompanying stuff like images in the same folder and refer to it relative to your article as usual

- The second important bit here is the so called 'front matter' of the post, that one defines things like article date, authors, and tags, here is also where you define a slug

  Example "front matter" (such a weird term)

  ```yaml
  ---
  title: "GLSL Development Made Shrimple"
  slug: glsl-development-made-shrimple
  description: "Tips and tools to make GLSL development easier"
  date: "2024-10-17"
  authors: ["jaker"]
  tags: ["glsl", "opengl", "vulkan", "beginner", "visual studio", "visual studio code", "article"]
  ---
  ```

  In this case you can also see how jaker put his article into `2024/2024-10-17-glsl-development-made-shrimple/index.md`

- Third important bit is to place a truncate line in your article, so that the generator doesnt take the whole post as the post preview :)

  Use a `<!-- truncate -->` comment to limit blog post size in the list view.

- Consider adding your author tag to blog/authors.yml. Simply check how jaker/deccer were added and massage yours accordingly. The key of each entry is also the value which goes into the `authors: ["author_here", "coauthor"]` thing.

- Try it out locally:
  You need nodejs/npm installed.

  ```bash
  cd blog
  npm i
  npm run start 
  ```

- `http://localhost:3000` should open automatically
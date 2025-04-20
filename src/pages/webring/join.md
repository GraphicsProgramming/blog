import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Join the GP webring

Do you have a cool website or blog that can be part of the GP webring? Join us!

## 1. Add yourself to the webring

To join the webring, add yourself to the [froglist](https://github.com/GraphicsProgramming/blog/blob/main/static/webring/froglist.json),
a file listing all the webring members. You can leave a PR with your edits to the file, or if you're not as comfortable with Git, an issue
asking to be added.

Simply add a new entry at the end of the JSON file with your website's data:

```json
{
  // A short name to identify your site.
  // This will be in the URL, so keep it short and url-friendly (no spaces or special characters)
  "name": "your-name-here",
  "url": "https://link-to-my-cool.website",
  "displayName": "Your Name Here",
  "description": "A short description of your cool website"
}
```

## 2. Add the webring links to your site

Once you've added yourself to the froglist, add the webring links to your website. Make sure they're visible from the homepage!

You can find templates for the links below, for plain HTML or react. Simply copy and paste the appropriate code somewhere in your
home page, or feel free to make your own links—you can style them to fit your site, just be sure to include our friendly little froge
so people know you're part of the webring.

<Tabs>
    <TabItem value="html" label="HTML" default>
        ```html
        <div style="display: flex, gap: 0.25rem, justify-content: center">
          <a href="https://graphics-programming.org/webring/frogs/[YOUR_WEBRING_NAME]/prev">⬅️</a>
          <a href="https://graphics-programming.org/webring/">
            <img
              src="https://graphics-programming.org/img/froge.webp"
              alt="a friendly froge"
              style="object-fit: contain, width: 1.5em, height: 1.5em"
            />
          </a>
          <a href="https://graphics-programming.org/webring/frogs/[YOUR_WEBRING_NAME]/next">➡️</a>
        </div>
        ```
    </TabItem>
    <TabItem value="react" label="JSX (React)" default>
        ```tsx
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            justifyContent: "center",
          }}
        >
          <a href="https://graphics-programming.org/webring/frogs/[YOUR_WEBRING_NAME]/prev">⬅️</a>
          <a href="https://graphics-programming.org/webring/">
            <img
              src="https://graphics-programming.org/img/froge.webp"
              alt="a friendly froge"
              style={{
                objectFit: "contain",
                width: "1.5em",
                height: "1.5em",
              }}
            />
          </a>
          <a href="https://graphics-programming.org/webring/frogs/[YOUR_WEBRING_NAME]/next">➡️</a>
        </div>
        ```
    </TabItem>
    <TabItem value="react-tw" label="JSX + Tailwind CSS" default>
        ```tsx
        <div className="flex flex-row gap-1 justify-center">
          <a href="https://graphics-programming.org/webring/frogs/[YOUR_WEBRING_NAME]/prev">⬅️</a>
          <a href="https://graphics-programming.org/webring/">
            <img
              className="object-contain w-6 h-6"
              src="https://graphics-programming.org/img/froge.webp"
              alt="a friendly froge"
            />
          </a>
          <a href="https://graphics-programming.org/webring/frogs/[YOUR_WEBRING_NAME]/next">➡️</a>
        </div>
        ```
    </TabItem>
</Tabs>

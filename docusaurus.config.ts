import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const config: Config = {
  title: "Graphics Programming Discord",
  tagline:
    "Articles, guides, tips and tricks from and for frogs and forgis of the graphics programming discord. This is what we do:",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://graphics-programming.org/",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  organizationName: "GraphicsProgramming",
  projectName: "blog",
  deploymentBranch: "gh-pages",
  trailingSlash: false,

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  plugins: [
    [
      require.resolve("docusaurus-lunr-search"),
      {
        languages: ["en"], // language codes
      },
    ],
  ],

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  stylesheets: [
    {
      href: "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css",
      type: "text/css",
      integrity:
        "sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+",
      crossorigin: "anonymous",
    },
  ],
  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "docs",
          sidebarPath: "./sidebars.ts",
        },
        blog: {
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
          showReadingTime: true,
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
          },
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/GraphicsProgramming/blog",
          // Useful options to enforce blogging best practices
          onInlineTags: "warn",
          onInlineAuthors: "warn",
          onUntruncatedBlogPosts: "warn",
          //routeBasePath: '/',
          blogSidebarCount: "ALL",
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
        sitemap: {
          changefreq: "always",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      respectPrefersColorScheme: true,
    },
    image: "img/social-embed.png",
    navbar: {
      title: "Graphics Programming",
      logo: {
        alt: "Graphics Programming",
        src: "img/gp-discord-logo.webp",
      },
      items: [
        {
          to: "/blog",
          label: "Blog",
          position: "left",
        },
        {
          type: "docSidebar",
          sidebarId: "discordServer",
          position: "left",
          label: "Discord Server",
        },
        {
          type: "docSidebar",
          sidebarId: "communityProjects",
          position: "left",
          label: "Community Projects",
        },
        {
          to: "/webring",
          label: "Webring",
          position: "left",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Community",
          items: [
            {
              label: "Discord",
              href: "https://discord.graphics-programming.org/",
            },
            {
              label: "YouTube",
              href: "https://www.youtube.com/@graphicsprogramming9074",
            },
            {
              label: "Twitter",
              href: "https://x.com/i/communities/1500963350825472000",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "Blog",
              to: "https://graphics-programming.org/blog",
            },
            {
              label: "GitHub",
              href: "https://github.com/GraphicsProgramming",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Graphics Programming Discord. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.duotoneLight,
      darkTheme: prismThemes.duotoneDark,
      additionalLanguages: ["glsl"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Forg Blog',
  tagline: 'Frogs and Forgs',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://graphicsprogramming.github.io/',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'GraphicsProgramming', // Usually your GitHub org/user name.
  projectName: 'blog', // Usually your repo name.
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: false,
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/GraphicsProgramming/blog',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
          routeBasePath: '/'
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'https://cdn.discordapp.com/splashes/318590007881236480/d0e3bd057a0b2cf557c3e120c1a277ae.jpg',
    navbar: {
      title: 'Graphics Programming',
      logo: {
        alt: 'Graphics Programming',
        src: 'https://cdn.discordapp.com/attachments/1181012862177644564/1181042141112320110/gp-discord-logo.gif?ex=671e3df5&is=671cec75&hm=2be3df1b8853374d7534d9608d98e86dd79f67f55ca68104e6cd7256d9e24a40&',
      },
      items: [
        {
          href: 'https://github.com/graphicsprogramming',
          position: 'right',
          className: 'header--github-link',
          "aria-label": "GitHub Repository"
        }
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discord.com/invite/graphicsprogramming',
            },
            {
              label: 'YouTube',
              href: 'https://www.youtube.com/@graphicsprogramming9074',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/GraphicsProgramming',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Graphics Programming Discord, Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.duotoneLight,
      darkTheme: prismThemes.duotoneDark,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

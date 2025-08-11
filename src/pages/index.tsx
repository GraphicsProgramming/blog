import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import Heading from "@theme/Heading";

import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("--landing", styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">
          Articles, guides, tips and tricks from and for frogs and forgis of the
          Graphics Programming discord.
          <br />
          This is what we do
        </p>
        <iframe
          className={styles.ytEmbed}
          width="960"
          height="520"
          src="https://www.youtube.com/embed/e9qK6EtqB-Q?si=2Z-Ol5B1klF7bm8f"
          title="YouTube video player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg test" to="/blog">
            Discover our Blog
          </Link>
          <Link
            className="button button--secondary button--lg test"
            to="https://discord.graphics-programming.org/"
          >
            Join our Discord Server
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />"
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />

        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            justifyContent: "center",
          }}
        >
          <a href="/webring/frogs/gp-blog/prev">⬅️</a>
          <a href="/webring/">
            <img
              src="/img/froge.webp"
              alt="a friendly froge"
              style={{
                objectFit: "contain",
                width: "1.5em",
                height: "1.5em",
              }}
            />
          </a>
          <a href="/webring/frogs/gp-blog/next">➡️</a>
        </div>
      </main>
    </Layout>
  );
}

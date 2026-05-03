import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import useStoredFeed from "@theme/useStoredFeed";

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

interface BlogItem {
  source: string;
  guid: string;
  title: string;
  pubDate: Date;
  link: string;
}

const FeedItems = () => {
  const dataSources = [
    useStoredFeed("Froyok Dev Blog"),
  ];

  const feedData: BlogItem[] = [];
  
  // merge the feeds into one
  dataSources.forEach((source) => source.item.forEach(({guid, title, pubDate, link}) => feedData.push({
    source: source.title,
    guid,
    title,
    pubDate: new Date(Date.parse(pubDate)),
    link
  })));

  // sort by date
  feedData.sort((itema: BlogItem, itemb: BlogItem) => (itema.pubDate < itemb.pubDate ? 1 : -1));

  // render
  return (
    <ul>
      {feedData.slice(0, 9).map((item: BlogItem) => (
        <li key={item.guid}><a href={item.link}>{item.source}: {item.title} ({item.pubDate.toLocaleDateString()})</a></li>
      ))}
    </ul>
  );
};

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
        <div className="row">
          <h2>The latest news from around the swamp:</h2>
          <p>
            <FeedItems />
          </p>
        </div>
      </div>
    </section>
  );
}

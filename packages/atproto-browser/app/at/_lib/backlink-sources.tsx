import { getBacklinkSources } from "@/lib/atproto";
import { BacklinkSource } from "./backlink-source";

export async function BacklinkSources({ target }: { target: string }) {
  const { links } = await getBacklinkSources(target);
  return Object.keys(links).toSorted().map(collection => (
    <div key={collection}>
      <h3 style={{marginBottom: 0}}>From <code>{collection}</code></h3>
      {Object.keys(links[collection]).toSorted().map(path => (
        <BacklinkSource
          key={path}
          target={target}
          collection={collection}
          path={path}
          total={links[collection][path]}
        />
      ))}
    </div>
  ));
}

"use client";
import { useState, Suspense } from "react";
import { Backlinks } from "./backlinks";

export function BacklinkSource({
  target,
  collection,
  path,
  total,
}: {
  target: string,
  collection: string,
  path: string,
  total: number,
}) {
  const [load, setLoad] = useState(false);

  return <div style={{ paddingLeft: '2em' }}>
    <p style={{ margin: 0 }}>
      <code>{path}</code>{' '}
      <button onClick={setLoad} disabled={load}>load ({total})</button>
    </p>
    {load && (
      <div style={{ margin: '0 0 1em 3em' }}>
        <Suspense
          fallback={
            <p style={{marginBottom: 0}} title="Fetching backlinks..." aria-busy>Loading&hellip;</p>
          }
        >
          <Backlinks
            target={target}
            collection={collection}
            path={path}
            fetchKey={`listBacklinks/target:${target}/collection:${collection}/path:${path}/cursor:none`}
            cursor={null}
          />
        </Suspense>
      </div>
    )}
  </div>;
}

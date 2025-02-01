"use client";

import { listBacklinks } from "@/lib/atproto";
import { getAtUriPath } from "@/lib/util";
import { AtUri } from "@atproto/syntax";
import Link from "@/lib/link";
import { Suspense, useState } from "react";
import useSWR from "swr";

import { FETCH_LIMIT } from "@/app/consts";

export function Backlinks({
  target,
  collection,
  path,
  fetchKey,
  cursor,
}: {
  target: string;
  collection: string;
  path: string;
  fetchKey: `listBacklinks/target:${string}/collection:${string}/path:${string}/cursor:${string}`;
  cursor?: string;
}) {
  const { data } = useSWR(
    fetchKey,
    () => listBacklinks(target, collection, path, cursor),
    {
      suspense: true,
    },
  );
  const [more, setMore] = useState(false);

  console.log('sup', data);

  return (
    <div>
      {data.linking_records.map((record) => {
        console.log(record);
        const at_uri = `at://${record.did}/${record.collection}/${record.rkey}`;
        return (
          <li key={at_uri}>
            <Link href={getAtUriPath(new AtUri(at_uri))}>{at_uri}</Link>
          </li>
        );
      })}
      {more ? (
        <Suspense fallback={<p>Loading...</p>}>
          <Backlinks
            target={target}
            collection={collection}
            path={path}
            cursor={data.cursor!}
            fetchKey={`listBacklinks/target:${target}/collection:${collection}/path:${path}/cursor:${data.cursor!}`}
          />
        </Suspense>
      ) : data.cursor ? (
        <button type="button" onClick={() => setMore(true)}>
          Load more
        </button>
      ) : null}
    </div>
  );
}

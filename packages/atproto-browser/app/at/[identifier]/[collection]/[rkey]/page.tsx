import { JSONType, JSONValue } from "@/app/at/_lib/atproto-json";
import { resolveIdentity } from "@/lib/atproto-server";
import { getHandle, getKey, getPds } from "@atproto/identity";
import { verifyRecords } from "@atproto/repo";
import { Suspense } from "react";

export default async function RkeyPage(props: {
  params: Promise<{
    identifier: string;
    collection: string;
    rkey: string;
  }>;
}) {
  const params = await props.params;
  const identityResult = await resolveIdentity(params.identifier);
  if (!identityResult.success) {
    return <div>🚨 {identityResult.error}</div>;
  }
  const didDocument = identityResult.didDocument;
  const handle = getHandle(didDocument);
  if (!handle) {
    return <div>🚨 No handle found for DID: {didDocument.id}</div>;
  }
  const pds = getPds(didDocument);
  if (!pds) {
    return <div>🚨 No PDS found for DID: {didDocument.id}</div>;
  }

  const getRecordUrl = new URL(`${pds}/xrpc/com.atproto.repo.getRecord`);
  getRecordUrl.searchParams.set("repo", didDocument.id);
  getRecordUrl.searchParams.set("collection", params.collection);
  getRecordUrl.searchParams.set("rkey", params.rkey);

  const response = await fetch(getRecordUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return (
      <div>
        🚨 Failed to fetch record: {response.statusText}. URL:{" "}
        {getRecordUrl.toString()}
      </div>
    );
  }

  const record = (await response.json()) as JSONType;

  const link = `at://${identityResult.didDocument.id}/${params.collection}/${params.rkey}`

  return (
    <>
      <link
        rel="alternate"
        href={link}
      />
        <h2>
          Record
          <Suspense
            fallback={
              <span title="Verifying record..." aria-busy>
                🤔
              </span>
            }
          >
            <RecordVerificationBadge
              did={didDocument.id}
              collection={params.collection}
              rkey={params.rkey}
            />
          </Suspense>
        </h2>
        <JSONValue data={record} repo={didDocument.id} />

        <h2>Backlinks 🔗</h2>
        <Suspense
          fallback={
            <>
              <h3>
                Likes:
                <span title="Fetching likes..." aria-busy>
                  🤔
                </span>
              </h3>
              <p>&hellip;</p>
            </>
          }
        >
          <Likes link={link} />
        </Suspense>
        <p><em>Note: the link aggregator currently only indexes likes and does not yet have the full network backfill. Some likes may be missing.</em></p>
    </>
  );
}

async function Likes({ link }: { link: string }) {
  let res;
  try {
    res = await fetch(`https://atproto-link-aggregator.fly.dev/likes?uri=${link}`);
  } catch (e) {
    return <h3>Likes: <span title="Failed to fetch likes">❌</span></h3>
  }
  if (!res.ok) {
    return <h3>Likes: <span title="Non-ok response when fetching likes">❌</span></h3>
  }
  let likes;
  try {
    likes = await res.json();
  } catch (e) {
    return <h3>Likes: <span title="Failed to get json from response">❌</span></h3>
  }
  return <>
    <h3>Likes: {likes.total_likes}</h3>
    <p>Most recently liked by:</p>
    <JSONValue data={likes.latest_dids} repo="asdfasdf" />
  </>;
}

async function RecordVerificationBadge({
  did,
  collection,
  rkey,
}: {
  did: string;
  collection: string;
  rkey: string;
}) {
  const identityResult = await resolveIdentity(did);
  if (!identityResult.success) {
    throw new Error(identityResult.error);
  }
  const didDoc = identityResult.didDocument;
  const pds = getPds(didDoc);
  if (!pds) {
    return <span title="Invalid record (no pds)">❌</span>;
  }

  const verifyRecordsUrl = new URL(`${pds}/xrpc/com.atproto.sync.getRecord`);
  verifyRecordsUrl.searchParams.set("did", did);
  verifyRecordsUrl.searchParams.set("collection", collection);
  verifyRecordsUrl.searchParams.set("rkey", rkey);

  const response = await fetch(verifyRecordsUrl, {
    headers: {
      accept: "application/vnd.ipld.car",
    },
  });

  if (!response.ok) {
    return (
      <span title={`Invalid record (failed to fetch ${await response.text()})`}>
        ❌
      </span>
    );
  }
  const car = new Uint8Array(await response.arrayBuffer());
  const key = getKey(didDoc);
  if (!key) {
    return <span title="Invalid record (no key)">❌</span>;
  }

  try {
    await verifyRecords(car, did, key);
    return <span title="Valid record">🔒</span>;
  } catch (e) {
    if (e instanceof Error) {
      return <span title={`Invalid record (${e.message})`}>❌</span>;
    } else {
      return <span title="Invalid record (unknown)">❌</span>;
    }
  }
}

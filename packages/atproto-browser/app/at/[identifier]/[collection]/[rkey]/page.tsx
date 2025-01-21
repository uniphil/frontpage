import { JSONType, JSONValue } from "@/app/at/_lib/atproto-json";
import { resolveIdentity } from "@/lib/atproto-server";
import { getHandle, getKey, getPds } from "@atproto/identity";
import { verifyRecords } from "@atproto/repo";
import { cache, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { z } from "zod";

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

  const getRecordResult = await getRecord(
    didDocument.id,
    params.collection,
    params.rkey,
  );

  if (!getRecordResult.success) {
    return <div>🚨 Failed to fetch record: {getRecordResult.error}</div>;
  }

  return (
    <>
      <link
        rel="alternate"
        href={`at://${identityResult.didDocument.id}/${params.collection}/${params.rkey}`}
      />
      <h2>
        Record{" "}
        <ErrorBoundary
          fallback={<span title="Error verifying record.">🤔</span>}
        >
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
        </ErrorBoundary>
      </h2>
      <div>
        <small style={{ opacity: 0.5 }}>
          cid: <code>{getRecordResult.record.cid}</code>
        </small>
      </div>
      <JSONValue data={getRecordResult.record.value} repo={didDocument.id} />
      <small>
        <a href={getRecordResult.url} rel="ugc">
          View raw record response
        </a>
      </small>
    </>
  );
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
  const proofBytes = new Uint8Array(await response.arrayBuffer());
  const key = getKey(didDoc);
  if (!key) {
    return <span title="Invalid record (no key)">❌</span>;
  }

  // No need to worry about sequential requests here, should have already been fetched and in the cache
  const recordResult = await getRecord(did, collection, rkey);
  if (!recordResult.success) {
    throw new Error(recordResult.error);
  }

  try {
    const [claim] = await verifyRecords(proofBytes, did, key);
    if (!claim || !claim.record) {
      return <span title="Invalid record (no record)">❌</span>;
    }

    // Whether we compare bytes or JSON or object value (ie. key order independent) isn't specced out. It's easiest for us to compare JSON so we'll do that.
    // Bytes would be the most strict equality check while object value would be the least strict, JSON is somewhere in the middle in terms of strictness as it's sensitive to different key ordering.
    if (
      JSON.stringify(claim.record) !==
      JSON.stringify(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (recordResult.record as any)?.value,
      )
    ) {
      return (
        <div style={{ display: "inline-block" }}>
          <span title="Invalid record (mismatch)">❌</span>
        </div>
      );
    }
  } catch (e) {
    if (e instanceof Error) {
      return <span title={`Invalid record (${e.message})`}>❌</span>;
    } else {
      return <span title="Invalid record (unknown)">❌</span>;
    }
  }

  return <span title="Valid record">🔒</span>;
}

type GetRecordResult =
  | {
      success: true;
      url: string;
      record: {
        uri: string;
        cid: string;
        value: JSONType;
      };
    }
  | {
      success: false;
      error: string;
    };

/**
 * Errors thrown in this function shuould be invariants that are checked before the function is called.
 */
const getRecord = cache(
  async (
    did: string,
    collection: string,
    rkey: string,
  ): Promise<GetRecordResult> => {
    const identityResult = await resolveIdentity(did);
    if (!identityResult.success) {
      throw new Error(identityResult.error);
    }

    const didDocument = identityResult.didDocument;

    const pds = getPds(didDocument);
    if (!pds) {
      throw new Error("No PDS found for DID");
    }

    const getRecordUrl = new URL(`${pds}/xrpc/com.atproto.repo.getRecord`);
    getRecordUrl.searchParams.set("repo", didDocument.id);
    getRecordUrl.searchParams.set("collection", collection);
    getRecordUrl.searchParams.set("rkey", rkey);

    const response = await fetch(getRecordUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return {
        success: false as const,
        error: `${response.statusText}. URL: ${getRecordUrl.toString()}`,
      };
    }

    const record = RecordValueSchema.parse(await response.json());

    return {
      success: true as const,
      record,
      url: getRecordUrl.toString(),
    };
  },
);

const JsonTypeSchema: z.ZodType<JSONType> = z.lazy(() =>
  z.union([
    z.record(JsonTypeSchema),
    z.array(JsonTypeSchema),
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
  ]),
);

const RecordValueSchema = z.object({
  uri: z.string(),
  cid: z.string(),
  value: JsonTypeSchema,
});

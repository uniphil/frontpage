import { cache } from "react";
import { z } from "zod";

import { FETCH_LIMIT, BACKLINKS_FETCH_LIMIT, BACKLINKS_HOST } from "@/app/consts";

const ListRecordsResponse = z.object({
  records: z.array(
    z.object({
      uri: z.string(),
      cid: z.string(),
    }),
  ),
  cursor: z.string().optional(),
});

export const listRecords = cache(
  async (pds: string, repo: string, collection: string, cursor?: string) => {
    const listRecordsUrl = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
    listRecordsUrl.searchParams.set("repo", repo);
    listRecordsUrl.searchParams.set("collection", collection);
    listRecordsUrl.searchParams.set("limit", FETCH_LIMIT);
    if (cursor) {
      listRecordsUrl.searchParams.set("cursor", cursor);
    }
    const res = await fetch(listRecordsUrl.toString());
    if (!res.ok) {
      throw new Error(`Failed to list records: ${res.statusText}`);
    }
    return ListRecordsResponse.parse(await res.json());
  },
);

const DESCRIBE_REPO_KNOWN_ERRORS = ["RepoTakenDown", "RepoNotFound"] as const;

export const describeRepo = cache(async (pds: string, repo: string) => {
  const describeRepoUrl = new URL(`${pds}/xrpc/com.atproto.repo.describeRepo`);
  describeRepoUrl.searchParams.set("repo", repo);
  const res = await fetch(describeRepoUrl.toString());
  if (!res.ok && res.status !== 400) {
    throw new Error(`Failed to describe repo: ${res.statusText}`);
  }
  const body = await res.json();

  if (res.status >= 500) {
    throw new Error(`Failed to describe repo: ${res.statusText}`);
  }

  if (!res.ok) {
    const parsed = DescribeRespoFailure.parse(body);
    const knownError =
      DESCRIBE_REPO_KNOWN_ERRORS.find((e) => e === parsed.error) ?? null;

    return {
      success: false as const,
      knownError,
      ...parsed,
    };
  }

  return {
    success: true as const,
    ...DescribeRepoSuccess.parse(body),
  };
});

const DescribeRepoSuccess = z.object({
  collections: z.array(z.string()),
});

const DescribeRespoFailure = z.object({
  error: z.string(),
  message: z.string().optional(),
});

const GetBacklinkSourcesResponse = z.object({
  links: z.record(
    z.string(),
    z.record(
      z.string(),
      z.number().gte(0))),
});

export const getBacklinkSources = cache(async (target: string) => {
  const getSourcesUrl = new URL(`${BACKLINKS_HOST}/links/all/count`);
  getSourcesUrl.searchParams.set("target", target);
  let res = await fetch(getSourcesUrl.toString());
  if (!res.ok) {
    console.error(res);
    throw new Error(`Failed to get backlink sources: ${res.statusText}`);
  }
  return GetBacklinkSourcesResponse.parse(await res.json());
});

const ListBacklinksResponse = z.object({
  total: z.number().gte(0),
  linking_records: z.array(
    z.object({
      did: z.string(),
      collection: z.string(),
      rkey: z.string(),
    }),
  ),
  cursor: z.string().nullable(),
});

export const listBacklinks = cache(
  async (target: string, collection: string, path: string, cursor?: string) => {
    const listBacklinksUrl = new URL(`${BACKLINKS_HOST}/links`);
    listBacklinksUrl.searchParams.set("target", target);
    listBacklinksUrl.searchParams.set("collection", collection);
    listBacklinksUrl.searchParams.set("path", path);
    listBacklinksUrl.searchParams.set("limit", BACKLINKS_FETCH_LIMIT);
    if (cursor) {
      listBacklinksUrl.searchParams.set("cursor", cursor);
    }
    const res = await fetch(listBacklinksUrl.toString());
    if (!res.ok) {
      throw new Error(`Failed to list backlinks: ${res.statusText}`);
    }
    return ListBacklinksResponse.parse(await res.json());
  },
);

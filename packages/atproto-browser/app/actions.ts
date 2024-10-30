"use server";

import { getAtUriPath } from "@/lib/util";
import { AtUri, isValidHandle } from "@atproto/syntax";
import { redirect } from "next/navigation";

export async function navigateUri(_state: unknown, formData: FormData) {
  const uriInput = formData.get("uri") as string;
  const handle = parseHandle(uriInput);

  if (handle) {
    redirect(getAtUriPath(new AtUri(`at://${handle}`)));
  }

  let uri;
  try {
    uri = new AtUri(uriInput);
  } catch (_) {
    return {
      error: `Invalid URI: ${uriInput}`,
    };
  }

  redirect(getAtUriPath(uri));
}

function parseHandle(input: string): string | null {
  if (!input.startsWith("@")) return null;
  const handle = input.slice(1);
  if (!isValidHandle(handle)) return null;
  return handle;
}

import Link from "@/lib/link";
import { AtUriForm } from "./aturi-form";
import type { Metadata } from "next";
import { EXAMPLE_PATH } from "@/app/consts";

export const metadata: Metadata = {
  title: "ATProto Browser",
  description: "Browse the atmosphere.",
};

export default function Home() {
  return (
    <main>
      <h1>Enter an AT uri:</h1>
      <div style={{ maxWidth: "450px" }}>
        <AtUriForm />
      </div>
      <p>
        eg. <Link href={`/at/${EXAMPLE_PATH}`}>at://{EXAMPLE_PATH}</Link>
      </p>

      <footer>
        <p>
          Developed by{" "}
          <Link href="/at/did:plc:2xau7wbgdq4phuou2ypwuen7/app.bsky.actor.profile/self">
            @tom.frontpage.team
          </Link>.
        </p>
        <p>
          Backlinks added by{" "}
          <Link href="/at/did:plc:hdhoaan3xa3jiuq4fg4mefid/app.bsky.actor.profile/self">
            @bad-example.com
          </Link>
          .
        </p>
        <p>
          <a href="https://github.com/uniphil/frontpage/tree/main/packages/atproto-browser">
            Forked source code
          </a>
          ,{" "}
          <a href="https://atproto-browser.vercel.app/">
            the original
          </a>.
        </p>
      </footer>
    </main>
  );
}

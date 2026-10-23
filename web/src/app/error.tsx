"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="mx-auto flex min-h-[60dvh] w-full max-w-3xl flex-col justify-center gap-5 px-6 py-16">
      <h1 className="display text-4xl">This page hit an error</h1>
      <p className="max-w-[56ch] text-[17px] leading-relaxed text-ink-2">
        Something in the page failed to render. Trying again usually fixes it; if it doesn&rsquo;t, the rest of the site still works.
        {error.digest ? <span className="mt-2 block text-sm text-ink-3">Reference: {error.digest}</span> : null}
      </p>
      <div className="flex flex-wrap gap-3">
        <button onClick={reset} className="inline-flex h-11 cursor-pointer items-center rounded-[3px] bg-ink px-4 font-semibold text-paper">
          Try again
        </button>
        <Link href="/" className="inline-flex h-11 items-center rounded-[3px] border border-rule-strong px-4 font-semibold">
          Home
        </Link>
      </div>
    </main>
  );
}

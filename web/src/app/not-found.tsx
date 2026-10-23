import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/shell/wordmark";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" className="poster mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <Wordmark />
      <p className="score text-[clamp(5rem,18vw,9rem)] leading-none text-marker">404</p>
      <h1 className="display text-4xl">Not on the chart</h1>
      <p className="max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
        There&rsquo;s no page at this address. It may have moved when the site was redesigned.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/" className="inline-flex h-11 items-center rounded-[3px] bg-ink px-4 font-semibold text-paper hover:bg-[#2a2e33]">
          Go to the bracket
        </Link>
        <Link href="/app/overview" className="inline-flex h-11 items-center rounded-[3px] border border-rule-strong px-4 font-semibold hover:border-ink">
          Open the app
        </Link>
      </div>
    </main>
  );
}

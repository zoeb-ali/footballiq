import Link from "next/link";
import { cn } from "@/lib/utils";

/** The chart's title block: a written-in red mark and the name in display type. */
export function Wordmark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2", className)} aria-label="FootballIQ home">
      <span aria-hidden="true" className="h-3.5 w-3.5 rotate-45 bg-marker transition-transform group-hover:rotate-[135deg]" />
      <span className="display text-[1.6rem] leading-none text-ink">FootballIQ</span>
    </Link>
  );
}

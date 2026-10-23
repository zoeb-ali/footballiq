"use client";

import { cn } from "@/lib/utils";

/** Native select: reliable, accessible, explicit colours for Windows. */
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 cursor-pointer rounded-[3px] border border-rule-strong bg-sheet px-3 pr-8 text-ink " +
          "hover:border-ink focus-visible:border-ink",
        className,
      )}
      {...props}
    />
  );
}

"use client";

import { ArrowClockwise, CloudSlash, MagnifyingGlass, Database } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";

function describe(error: unknown): { title: string; detail: string } {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return { title: "Demo session needed", detail: "Open the app from the home page, then try again." };
    }
    if (error.status === 429) {
      return { title: "Too many requests", detail: error.problem?.detail ?? "Wait a minute, then try again." };
    }
    if (error.status === 503 || error.status === 502 || error.status === 504) {
      return {
        title: "The live API is asleep",
        detail:
          "This page needs the live backend, which sleeps after 15 idle minutes on its free plan. " +
          "Your request has woken it; try again in about a minute.",
      };
    }
    return {
      title: error.problem?.title ?? `Request failed (${error.status})`,
      detail: error.problem?.detail ?? "The API returned an error.",
    };
  }
  return { title: "Couldn't load this", detail: "Check your connection and try again." };
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { title, detail } = describe(error);
  return (
    <div role="alert" className="flex flex-col items-start gap-3 border-y border-rule py-8">
      <CloudSlash size={28} weight="duotone" className="text-caution" aria-hidden="true" />
      <p className="text-lg font-bold">{title}</p>
      <p className="max-w-[60ch] text-[15px] text-ink-2">{detail}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <ArrowClockwise size={16} aria-hidden="true" /> Try again
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  icon = "search",
  children,
}: {
  title: string;
  hint?: string;
  icon?: "search" | "data";
  children?: React.ReactNode;
}) {
  const Icon = icon === "data" ? Database : MagnifyingGlass;
  return (
    <div className="flex flex-col items-start gap-3 border border-dashed border-rule-strong p-8">
      <Icon size={28} weight="duotone" className="text-ink-3" aria-hidden="true" />
      <p className="text-lg font-bold">{title}</p>
      {hint ? <p className="max-w-[60ch] text-[15px] text-ink-2">{hint}</p> : null}
      {children}
    </div>
  );
}

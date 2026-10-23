"use client";

import { List, MagnifyingGlass } from "@phosphor-icons/react";
import { useHealth } from "@/lib/api/queries";
import { useUiStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Wordmark } from "./wordmark";

/** Honest status: /health is never served from a snapshot, so this can't lie. */
function ApiStatus() {
  const health = useHealth();
  const up = health.data?.data.status === "alive";
  const state = health.isPending ? "checking" : up ? "live" : "asleep";
  const label =
    state === "checking" ? "Checking API" : state === "live" ? "Live API" : "API asleep, showing saved data";
  return (
    <span className="flex items-center gap-2 text-[13px] text-ink-2" role="status" title={label}>
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 rounded-full",
          state === "checking" && "bg-rule-strong",
          state === "live" && "bg-pitch",
          state === "asleep" && "bg-caution",
        )}
      />
      <span className={cn(state === "live" ? "hidden sm:inline" : "hidden md:inline")}>{label}</span>
    </span>
  );
}

export function Topbar() {
  const { setSidebarOpen, setPaletteOpen } = useUiStore();
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-rule bg-paper/95 px-4 backdrop-blur-sm sm:px-6">
      <button
        aria-label="Open navigation"
        className="grid h-11 w-11 place-items-center rounded-[3px] text-ink hover:bg-tint lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <List size={22} aria-hidden="true" />
      </button>
      <Wordmark className="lg:hidden" />
      <button
        onClick={() => setPaletteOpen(true)}
        aria-label="Search teams and players"
        className="ml-auto flex h-11 items-center gap-2 rounded-[3px] border border-rule-strong bg-sheet px-3 text-[15px] text-ink-3 transition-colors hover:border-ink lg:ml-0 lg:w-full lg:max-w-md"
      >
        <MagnifyingGlass size={18} aria-hidden="true" />
        <span className="hidden flex-1 text-left lg:inline">Search teams and players…</span>
        <kbd className="hidden rounded-[2px] border border-rule px-1.5 py-0.5 text-xs text-ink-3 lg:inline">⌘&nbsp;K</kbd>
      </button>
      <div className="flex items-center gap-3 lg:ml-auto">
        <ApiStatus />
      </div>
    </header>
  );
}

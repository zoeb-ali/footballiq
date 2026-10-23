"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/store";
import { NAV_GROUPS } from "./nav";
import { Wordmark } from "./wordmark";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-2 text-[13px] font-semibold text-ink-3">{group.label}</p>
          <ul className="flex flex-col">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-2.5 rounded-[3px] px-2 text-[15px] transition-colors",
                      active ? "bg-ink font-semibold text-paper" : "text-ink-2 hover:bg-tint hover:text-ink",
                    )}
                  >
                    <Icon size={18} weight={active ? "fill" : "regular"} aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Colophon() {
  return (
    <p className="border-t border-rule px-6 py-4 text-xs leading-relaxed text-ink-3">
      World Cup 2026, all 104 matches.
      <br />
      Built by{" "}
      <a className="underline hover:text-ink" href="https://zoeb-ali.github.io" target="_blank" rel="noopener noreferrer">
        Zoeb Ali Khan
      </a>
    </p>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-rule bg-paper lg:flex">
        <div className="px-6 pb-6 pt-5">
          <Wordmark />
        </div>
        <NavLinks />
        <Colophon />
      </aside>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col overscroll-contain border-r border-rule bg-paper">
            <div className="flex items-center justify-between px-6 pb-5 pt-5">
              <Wordmark />
              <button
                aria-label="Close navigation"
                className="grid h-11 w-11 place-items-center rounded-[3px] text-ink-2 hover:bg-tint"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <NavLinks onNavigate={() => setSidebarOpen(false)} />
            <Colophon />
          </aside>
        </div>
      ) : null}
    </>
  );
}

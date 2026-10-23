"use client";

/**
 * ⌘K search. Honest client-side search: the API has no search endpoint, so
 * we hydrate the (small) team + player registries once and fuzzy-match here.
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Command } from "cmdk";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import type { Paginated, Player, Team } from "@/lib/api/types";
import { useUiStore } from "@/lib/store";
import { Flag } from "@/components/domain/monogram";

const PLAYER_PAGES = 13; // 1,248 players / 100 per page

function useSearchIndex(enabled: boolean) {
  return useQuery({
    queryKey: ["search-index"],
    enabled,
    staleTime: Infinity,
    queryFn: async () => {
      const teams = await apiGet<Paginated<Team>>("/v1/teams?limit=100");
      const pages = await Promise.all(
        Array.from({ length: PLAYER_PAGES }, (_, i) =>
          apiGet<Paginated<Player>>(`/v1/players?limit=100&offset=${i * 100}`).catch(
            () => null,
          ),
        ),
      );
      const players = pages.flatMap((p) => p?.data.items ?? []);
      return { teams: teams.data.items, players };
    },
  });
}

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useUiStore();
  const router = useRouter();
  const index = useSearchIndex(paletteOpen);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, setPaletteOpen]);

  function go(href: string) {
    setPaletteOpen(false);
    router.push(href);
  }

  if (!paletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Search">
      <button
        aria-label="Close search"
        className="absolute inset-0 bg-ink/40"
        onClick={() => setPaletteOpen(false)}
      />
      <div className="absolute left-1/2 top-[12vh] w-[min(600px,94vw)] -translate-x-1/2 overflow-hidden rounded-[4px] border border-ink bg-sheet shadow-[0_24px_48px_-24px_rgba(18,20,23,0.45)]">
        <Command label="Search teams and players" loop>
          <Command.Input
            autoFocus
            placeholder="Search 48 teams and 1,248 players…"
            className="h-14 w-full border-b border-rule bg-transparent px-4 text-ink outline-none placeholder:text-ink-3"
          />
          <Command.List className="max-h-[60vh] overflow-y-auto overscroll-contain p-2">
            <Command.Empty className="p-4 text-sm text-ink-3">
              {index.isFetching ? "Loading players…" : "No team or player matches that."}
            </Command.Empty>
            {index.data ? (
              <>
                <Command.Group
                  heading="Teams"
                  className="text-[13px] font-semibold text-ink-3 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2"
                >
                  {index.data.teams.map((t) => (
                    <Command.Item
                      key={t.team_id}
                      value={`${t.name} ${t.fifa_code}`}
                      onSelect={() => go(`/app/teams/${t.team_id}`)}
                      className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[3px] px-2 text-[15px] text-ink aria-selected:bg-ink aria-selected:text-paper"
                    >
                      <Flag code={t.fifa_code} />
                      {t.name}
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group
                  heading="Players"
                  className="text-[13px] font-semibold text-ink-3 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2"
                >
                  {index.data.players.map((p) => (
                    <Command.Item
                      key={p.player_id}
                      value={`${p.name} ${p.team.name} ${p.position}`}
                      onSelect={() => go(`/app/players/${p.player_id}`)}
                      className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[3px] px-2 text-[15px] text-ink aria-selected:bg-ink aria-selected:text-paper"
                    >
                      <Flag code={p.team.fifa_code} />
                      <span className="flex-1">{p.name}</span>
                      <span className="text-[13px] opacity-70">{p.team.name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </>
            ) : null}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

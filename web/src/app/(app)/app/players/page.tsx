"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Flag } from "@/components/domain/monogram";
import { PageHeader } from "@/components/domain/page-header";
import { Pager } from "@/components/domain/pager";
import { SourceBadge } from "@/components/domain/source-badge";
import { EmptyState, ErrorState } from "@/components/domain/states";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { usePlayers, useTeams } from "@/lib/api/queries";
import type { PlayerSort } from "@/lib/api/types";
import { ageFrom, fmtEur, fmtNum } from "@/lib/format";
import { useUrlState } from "@/lib/url-state";
import { cn } from "@/lib/utils";

const PAGE = 50;
const POSITIONS = [
  ["GK", "Goalkeepers"],
  ["DEF", "Defenders"],
  ["MID", "Midfielders"],
  ["FWD", "Forwards"],
] as const;
const SORTS: [PlayerSort, string][] = [
  ["market_value", "Market value"],
  ["goals", "Goals at the tournament"],
  ["assists", "Assists at the tournament"],
  ["minutes", "Minutes played"],
];

function PlayersInner() {
  const url = useUrlState();
  const teamId = url.get("team") ? Number(url.get("team")) : undefined;
  const position = url.get("pos") ?? undefined;
  const sort = (SORTS.find(([k]) => k === url.get("sort"))?.[0] ?? "market_value") as PlayerSort;
  const offset = Number(url.get("from") ?? 0) || 0;
  const teams = useTeams(100);
  const players = usePlayers({ teamId, position, limit: PAGE, offset, sort });
  const total = players.data?.data.total ?? 0;
  const highlight = sort === "goals" ? "goals" : sort === "assists" ? "assists" : sort === "minutes" ? "minutes" : "value";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Players"
        description="All 1,248 players in the 48 squads, with what each did at the tournament. Sort by market value or turn the list into a leaderboard."
        actions={players.data ? <SourceBadge source={players.data.source} /> : undefined}
      />
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">
          Team
          <Select value={teamId ?? ""} onChange={(e) => url.set({ team: e.target.value, from: undefined })}>
            <option value="">All 48 teams</option>
            {(teams.data?.data.items ?? []).map((t) => (
              <option key={t.team_id} value={t.team_id}>
                {t.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">
          Position
          <Select value={position ?? ""} onChange={(e) => url.set({ pos: e.target.value, from: undefined })}>
            <option value="">All positions</option>
            {POSITIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">
          Sort by
          <Select
            value={sort}
            onChange={(e) => url.set({ sort: e.target.value === "market_value" ? undefined : e.target.value, from: undefined })}
          >
            {SORTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {players.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : players.isError ? (
        <ErrorState error={players.error} onRetry={() => players.refetch()} />
      ) : players.data.data.items.length === 0 ? (
        <EmptyState title="No players match these filters" hint="Clear the team or position filter to see more." />
      ) : (
        <>
          {/* Phones: stacked rows. */}
          <ul className="divide-y divide-rule border-y border-rule sm:hidden">
            {players.data.data.items.map((p, i) => (
              <li key={p.player_id}>
                <Link href={`/app/players/${p.player_id}`} className="flex items-center gap-3 py-3">
                  <span className="w-7 text-right text-[13px] text-ink-3">{offset + i + 1}</span>
                  <Flag code={p.team.fifa_code} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block truncate text-[13px] text-ink-3">
                      {p.position}, {p.club}
                    </span>
                  </span>
                  <span className="score text-right text-lg">
                    {highlight === "value"
                      ? fmtEur(p.market_value_eur)
                      : highlight === "minutes"
                        ? fmtNum(p.tournament?.minutes ?? 0)
                        : (p.tournament?.[highlight] ?? 0)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {/* Wider: the full table. */}
          <div className="hidden sm:block">
            <Table>
              <THead>
                <tr>
                  <TH className="w-10 text-right">#</TH>
                  <TH>Player</TH>
                  <TH>Team</TH>
                  <TH>Pos</TH>
                  <TH className="text-right">Age</TH>
                  <TH className={cn("text-right", highlight === "minutes" && "text-ink")}>Mins</TH>
                  <TH className={cn("text-right", highlight === "goals" && "text-ink")}>Goals</TH>
                  <TH className={cn("text-right", highlight === "assists" && "text-ink")}>Assists</TH>
                  <TH className={cn("text-right", highlight === "value" && "text-ink")}>Market value</TH>
                </tr>
              </THead>
              <TBody>
                {players.data.data.items.map((p, i) => (
                  <TR key={p.player_id}>
                    <TD className="text-right text-ink-3">{offset + i + 1}</TD>
                    <TD>
                      <Link href={`/app/players/${p.player_id}`} className="font-semibold hover:underline">
                        {p.name}
                      </Link>
                      <span className="block text-[13px] text-ink-3">{p.club}</span>
                    </TD>
                    <TD>
                      <span className="flex items-center gap-2 whitespace-nowrap text-ink-2">
                        <Flag code={p.team.fifa_code} />
                        {p.team.name}
                      </span>
                    </TD>
                    <TD className="text-ink-2">{p.position}</TD>
                    <TD className="text-right">{ageFrom(p.date_of_birth) ?? ""}</TD>
                    <TD className={cn("text-right", highlight === "minutes" ? "score text-lg" : "text-ink-2")}>
                      {fmtNum(p.tournament?.minutes ?? 0)}
                    </TD>
                    <TD className={cn("text-right", highlight === "goals" ? "score text-lg" : "text-ink-2")}>
                      {p.tournament?.goals ?? 0}
                    </TD>
                    <TD className={cn("text-right", highlight === "assists" ? "score text-lg" : "text-ink-2")}>
                      {p.tournament?.assists ?? 0}
                    </TD>
                    <TD className={cn("text-right", highlight === "value" ? "score text-lg" : "text-ink-2")}>
                      {fmtEur(p.market_value_eur)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          <Pager offset={offset} page={PAGE} total={total} onChange={(o) => url.set({ from: o || undefined })} />
        </>
      )}
    </div>
  );
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <PlayersInner />
    </Suspense>
  );
}

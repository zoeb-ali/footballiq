"use client";

import Link from "next/link";
import { use, useMemo } from "react";
import { Flag } from "@/components/domain/monogram";
import { SourceBadge } from "@/components/domain/source-badge";
import { ErrorState } from "@/components/domain/states";
import { StatCard } from "@/components/domain/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAllMatches, useNationConcentration, usePlayers, useTeam } from "@/lib/api/queries";
import { fmtDate, fmtEur, fmtPct } from "@/lib/format";
import { finishes, isCompleted, resultNote, winnerId } from "@/lib/tournament";
import { cn } from "@/lib/utils";

const HHI_CONCENTRATED = 0.2; // the conventional "concentrated" threshold

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const teamId = Number(id);
  const team = useTeam(teamId);
  const squad = usePlayers({ teamId, limit: 40 });
  const concentration = useNationConcentration(teamId);
  const matches = useAllMatches();

  const own = useMemo(
    () =>
      (matches.data?.data ?? []).filter(
        (m) => isCompleted(m) && (m.home.team_id === teamId || (m.away.kind === "team" && m.away.team_id === teamId)),
      ),
    [matches.data, teamId],
  );
  const finish = useMemo(() => finishes(matches.data?.data ?? []).get(teamId), [matches.data, teamId]);

  if (team.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (team.isError) return <ErrorState error={team.error} onRetry={() => team.refetch()} />;
  const t = team.data.data;
  const hhi = concentration.data?.data.hhi_players;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end gap-5 border-b-2 border-ink pb-5">
        <Flag code={t.fifa_code} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="display text-[clamp(2.4rem,6vw,3.5rem)]">{t.name}</h1>
          <p className="mt-2 text-[16px] text-ink-2">
            {[t.confederation, t.group_letter ? `Group ${t.group_letter}` : null].filter(Boolean).join(", ")}
            {finish ? (
              <>
                {". "}
                <strong className={cn(finish === "Champions" ? "text-marker" : "text-ink")}>{finish}</strong>
                {finish === "Champions" || finish === "Runners-up" ? "" : finish.includes("place") ? "" : " was as far as they went"}
                .
              </>
            ) : null}
          </p>
        </div>
        <SourceBadge source={team.data.source} />
      </header>

      <div className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
        <StatCard label="Elo rating" value={t.elo_rating ?? ""} hint="Pre-tournament, used by the simulator" />
        <StatCard label="FIFA ranking" value={t.fifa_ranking ?? ""} hint="Pre-tournament" />
        <StatCard label="Matches played" value={own.length || ""} />
        <StatCard
          label="Club concentration"
          value={hhi != null ? hhi.toFixed(2) : ""}
          tone={hhi != null && hhi > HHI_CONCENTRATED ? "signal" : undefined}
          hint="0 = spread over many clubs, 1 = all from one"
        />
      </div>

      <section aria-labelledby="results">
        <h2 id="results" className="mb-3 text-xl font-bold">
          Their tournament
        </h2>
        {matches.isPending ? (
          <Skeleton className="h-40" />
        ) : (
          <ol className="divide-y divide-rule border-y border-rule">
            {own.map((m) => {
              if (!isCompleted(m)) return null;
              const home = m.home.team_id === teamId;
              const opp = home ? m.away : m.home;
              const gf = home ? m.score.home : m.score.away;
              const ga = home ? m.score.away : m.score.home;
              const w = winnerId(m);
              const outcome = w === teamId ? "W" : w === null ? "D" : m.is_knockout && gf === ga ? "L" : gf > ga ? "W" : gf < ga ? "L" : "D";
              const note = resultNote(m);
              return (
                <li key={m.match_id} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-2.5">
                  <span
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-[2px] text-[13px] font-bold",
                      outcome === "W" ? "bg-ink text-paper" : outcome === "D" ? "border border-rule-strong" : "bg-tint text-ink-3",
                    )}
                    aria-label={{ W: "Won", D: "Drew", L: "Lost" }[outcome]}
                  >
                    {outcome}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="text-ink-3">v</span>
                      <Flag code={opp.fifa_code} />
                      <Link href={`/app/teams/${opp.team_id}`} className="truncate hover:underline">
                        {opp.name}
                      </Link>
                    </span>
                    <span className="block text-[13px] text-ink-3">
                      {m.stage}, {fmtDate(m.date)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="score text-xl">
                      {gf}–{ga}
                    </span>
                    {note ? <span className="block text-[12px] font-semibold text-marker">{note}</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Squad</CardTitle>
            <CardDescription>By market value, with what each player did at the tournament.</CardDescription>
          </CardHeader>
          {squad.isPending ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          ) : squad.isError ? (
            <div className="px-4">
              <ErrorState error={squad.error} onRetry={() => squad.refetch()} />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Player</TH>
                  <TH className="text-right">Apps</TH>
                  <TH className="text-right">Goals</TH>
                  <TH className="text-right">Value</TH>
                </tr>
              </THead>
              <TBody>
                {squad.data.data.items.map((p) => (
                  <TR key={p.player_id}>
                    <TD>
                      <Link href={`/app/players/${p.player_id}`} className="font-semibold hover:underline">
                        {p.name}
                      </Link>
                      <span className="block text-[13px] text-ink-3">
                        {p.position}, {p.club}
                      </span>
                    </TD>
                    <TD className="text-right text-ink-2">{p.tournament?.matches ?? 0}</TD>
                    <TD className={cn("text-right", p.tournament?.goals ? "score text-lg" : "text-ink-3")}>
                      {p.tournament?.goals ?? 0}
                    </TD>
                    <TD className="text-right">{fmtEur(p.market_value_eur)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Which clubs this squad comes from</CardTitle>
            <CardDescription>
              Share of the squad from each club. A few clubs supplying most players means more exposure to one
              club&rsquo;s fixtures, injuries and form.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {concentration.isPending ? (
              <Skeleton className="h-48" />
            ) : concentration.isError ? (
              <ErrorState error={concentration.error} onRetry={() => concentration.refetch()} />
            ) : (
              <ul className="flex flex-col gap-3">
                {concentration.data.data.top_suppliers.map((s) => (
                  <li key={s.club} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3 text-[14px]">
                      <span className="truncate">{s.club}</span>
                      <span className="whitespace-nowrap text-ink-2">
                        {s.player_count} {s.player_count === 1 ? "player" : "players"}, {fmtPct(s.share, 0)}
                      </span>
                    </div>
                    <div className="h-2 bg-tint" aria-hidden="true">
                      <div className="h-full bg-ink" style={{ width: `${s.share * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

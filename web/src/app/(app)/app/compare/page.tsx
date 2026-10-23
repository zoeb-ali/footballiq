"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Flag } from "@/components/domain/monogram";
import { PageHeader } from "@/components/domain/page-header";
import { EmptyState, ErrorState } from "@/components/domain/states";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllMatches, useNationConcentration, usePlayers, useTeam, useTeams } from "@/lib/api/queries";
import type { Team } from "@/lib/api/types";
import { fmtDate, fmtEur } from "@/lib/format";
import { eloExpectancy, finishRank, finishes, isCompleted, resultNote } from "@/lib/tournament";
import { useUrlState } from "@/lib/url-state";
import { cn } from "@/lib/utils";

type Row = { label: string; a: number | null; b: number | null; fmt: (v: number) => string; better: "high" | "low" | null; note?: string };

function CompareBody({ a, b }: { a: number; b: number }) {
  const teamA = useTeam(a);
  const teamB = useTeam(b);
  const squadA = usePlayers({ teamId: a, limit: 40 });
  const squadB = usePlayers({ teamId: b, limit: 40 });
  const concA = useNationConcentration(a);
  const concB = useNationConcentration(b);
  const matches = useAllMatches();

  const all = [teamA, teamB, squadA, squadB, concA, concB];
  if (all.some((q) => q.isPending)) return <Skeleton className="h-96" />;
  const failed = all.find((q) => q.isError);
  if (failed || !teamA.data || !teamB.data || !squadA.data || !squadB.data) {
    return <ErrorState error={failed?.error} onRetry={() => all.forEach((q) => q.refetch())} />;
  }

  const ta = teamA.data.data;
  const tb = teamB.data.data;
  const value = (items: { market_value_eur: number }[]) => items.reduce((n, p) => n + p.market_value_eur, 0);
  const goals = (items: { tournament: { goals: number } | null }[]) => items.reduce((n, p) => n + (p.tournament?.goals ?? 0), 0);
  const fin = finishes(matches.data?.data ?? []);
  const fa = fin.get(a);
  const fb = fin.get(b);

  const rows: Row[] = [
    { label: "Finish", a: fa ? finishRank(fa) : null, b: fb ? finishRank(fb) : null, fmt: () => "", better: "low" },
    { label: "Elo rating", a: ta.elo_rating, b: tb.elo_rating, fmt: (v) => String(v), better: "high" },
    { label: "FIFA ranking", a: ta.fifa_ranking, b: tb.fifa_ranking, fmt: (v) => `${v}`, better: "low" },
    { label: "Squad market value", a: value(squadA.data.data.items), b: value(squadB.data.data.items), fmt: fmtEur, better: "high" },
    { label: "Goals by squad players", a: goals(squadA.data.data.items), b: goals(squadB.data.data.items), fmt: (v) => String(v), better: "high", note: "Own goals not included" },
    {
      label: "Clubs supplying the squad",
      a: concA.data?.data.supplier_count ?? null,
      b: concB.data?.data.supplier_count ?? null,
      fmt: (v) => String(v),
      better: null,
    },
    {
      label: "Club concentration",
      a: concA.data?.data.hhi_players ?? null,
      b: concB.data?.data.hhi_players ?? null,
      fmt: (v) => v.toFixed(2),
      better: null,
      note: "0 = many clubs, 1 = one club",
    },
  ];

  const met = (matches.data?.data ?? []).filter(
    (m) =>
      isCompleted(m) &&
      m.away.kind === "team" &&
      ((m.home.team_id === a && m.away.team_id === b) || (m.home.team_id === b && m.away.team_id === a)),
  );
  const pA = ta.elo_rating != null && tb.elo_rating != null ? eloExpectancy(ta.elo_rating, tb.elo_rating) : null;

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <table className="w-full border-collapse text-[15px] tabular-nums">
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className="w-[38%] px-4 py-3 text-left">
                <span className="flex items-center gap-2 text-lg font-bold">
                  <Flag code={ta.fifa_code} size="md" /> {ta.name}
                </span>
              </th>
              <th scope="col" className="px-2 py-3 text-center text-[13px] font-semibold text-ink-2">
                <span className="sr-only">Measure</span>
              </th>
              <th scope="col" className="w-[38%] px-4 py-3 text-right">
                <span className="flex items-center justify-end gap-2 text-lg font-bold">
                  {tb.name} <Flag code={tb.fifa_code} size="md" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((r) => {
              const lead =
                r.better && r.a != null && r.b != null && r.a !== r.b
                  ? (r.better === "high" ? r.a > r.b : r.a < r.b)
                    ? "a"
                    : "b"
                  : null;
              const show = (v: number | null, side: "a" | "b") =>
                r.label === "Finish" ? ((side === "a" ? fa : fb) ?? "") : v == null ? "" : r.fmt(v);
              return (
                <tr key={r.label}>
                  <td className={cn("px-4 py-3", lead === "a" ? "font-bold text-ink" : "text-ink-2")}>
                    {show(r.a, "a")}
                    {lead === "a" ? <span className="sr-only"> (ahead)</span> : null}
                  </td>
                  <th scope="row" className="px-2 py-3 text-center text-[13px] font-semibold text-ink-3">
                    {r.label}
                    {r.note ? <span className="block text-[12px] font-normal">{r.note}</span> : null}
                  </th>
                  <td className={cn("px-4 py-3 text-right", lead === "b" ? "font-bold text-ink" : "text-ink-2")}>
                    {show(r.b, "b")}
                    {lead === "b" ? <span className="sr-only"> (ahead)</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <section aria-labelledby="h2h" className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 id="h2h" className="mb-2 text-lg font-bold">
            When they met
          </h2>
          {met.length ? (
            <ul className="divide-y divide-rule border-y border-rule">
              {met.map((m) =>
                isCompleted(m) ? (
                  <li key={m.match_id} className="py-3">
                    <span className="font-semibold">
                      {m.home.name} {m.score.home}–{m.score.away} {m.away.name}
                    </span>
                    {resultNote(m) ? <span className="text-marker"> ({resultNote(m)})</span> : null}
                    <span className="block text-[13px] text-ink-3">
                      {m.stage}, {fmtDate(m.date)}
                    </span>
                  </li>
                ) : null,
              )}
            </ul>
          ) : (
            <p className="text-[15px] text-ink-2">They didn&rsquo;t play each other at this tournament.</p>
          )}
        </div>
        <div>
          <h2 className="mb-2 text-lg font-bold">If they played</h2>
          {pA != null ? (
            <p className="text-[15px] leading-relaxed text-ink-2">
              Elo gives {ta.name} an expected score of <strong className="text-ink">{Math.round(pA * 100)}%</strong>{" "}
              against {tb.name}.{" "}
              <Link href={`/app/simulator?home=${a}&away=${b}`} className="font-semibold text-pitch underline">
                Simulate the match
              </Link>{" "}
              for win, draw and loss chances.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

const SUGGESTIONS: [string, string, string][] = [
  ["ESP", "ARG", "The final"],
  ["FRA", "ENG", "Third-place match"],
  ["BRA", "NOR", "The biggest upset"],
];

function CompareInner() {
  const url = useUrlState();
  const teams = useTeams(100);
  const list: Team[] = teams.data?.data.items ?? [];
  const a = url.get("a") ?? "";
  const b = url.get("b") ?? "";
  const id = (code: string) => list.find((t) => t.fifa_code === code)?.team_id;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compare two teams"
        description="Ratings, squad value, goals and how each squad is spread across clubs, side by side. The link keeps your choice, so you can share it."
      />
      <div className="flex flex-wrap gap-3">
        {(["a", "b"] as const).map((k, i) => (
          <label key={k} className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">
            {i === 0 ? "First team" : "Second team"}
            <Select value={k === "a" ? a : b} onChange={(e) => url.set({ [k]: e.target.value })}>
              <option value="">Choose a team…</option>
              {list.map((t) => (
                <option key={t.team_id} value={t.team_id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </label>
        ))}
      </div>
      {a && b && a !== b ? (
        <CompareBody a={Number(a)} b={Number(b)} />
      ) : (
        <EmptyState
          title={a && a === b ? "Pick two different teams" : "Pick two teams, or start from one of these"}
          hint="Every row marks which side is ahead, and the page tells you whether they met."
        >
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(([x, y, label]) => {
              const ia = id(x);
              const ib = id(y);
              return ia && ib ? (
                <button
                  key={label}
                  onClick={() => url.set({ a: ia, b: ib })}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[3px] border border-rule-strong px-3 text-[14px] font-semibold hover:border-ink"
                >
                  <Flag code={x} size="xs" /> <Flag code={y} size="xs" /> {label}
                </button>
              ) : null;
            })}
          </div>
        </EmptyState>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <CompareInner />
    </Suspense>
  );
}

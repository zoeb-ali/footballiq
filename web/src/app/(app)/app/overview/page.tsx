"use client";

import Link from "next/link";
import { LandingChart } from "@/components/bracket/landing-chart";
import { Flag } from "@/components/domain/monogram";
import { PageHeader } from "@/components/domain/page-header";
import { SourceBadge } from "@/components/domain/source-badge";
import { ErrorState } from "@/components/domain/states";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAllMatches, usePlayers, useTeams, useValuations } from "@/lib/api/queries";
import { fmtEur, fmtNum, fmtSigned } from "@/lib/format";

function TopScorers() {
  const q = usePlayers({ sort: "goals", limit: 10 });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top scorers</CardTitle>
        <Link href="/app/players?sort=goals" className="text-[14px] font-semibold text-pitch underline">
          Full leaderboard
        </Link>
      </CardHeader>
      {q.isPending ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      ) : q.isError ? (
        <div className="px-4">
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH className="w-8 text-right">#</TH>
              <TH>Player</TH>
              <TH className="text-right">Goals</TH>
              <TH className="text-right">Assists</TH>
              <TH className="hidden text-right sm:table-cell">Minutes</TH>
            </tr>
          </THead>
          <TBody>
            {q.data.data.items.map((p, i) => (
              <TR key={p.player_id}>
                <TD className="text-right text-ink-3">{i + 1}</TD>
                <TD>
                  <Link href={`/app/players/${p.player_id}`} className="flex items-center gap-2 font-semibold hover:underline">
                    <Flag code={p.team.fifa_code} />
                    {p.name}
                  </Link>
                </TD>
                <TD className="score text-right text-lg">{p.tournament?.goals ?? 0}</TD>
                <TD className="text-right">{p.tournament?.assists ?? 0}</TD>
                <TD className="hidden text-right text-ink-2 sm:table-cell">{fmtNum(p.tournament?.minutes ?? 0)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

function BiggestGaps() {
  const q = useValuations({ limit: 6 });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Where the model and the market disagree most</CardTitle>
        <CardDescription>
          The model prices these players highest above their market value. It lands within 20% of market for only about
          one player in five, so treat these as questions, not findings.
        </CardDescription>
      </CardHeader>
      {q.isPending ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      ) : q.isError ? (
        <div className="px-4">
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        </div>
      ) : (
        <ul className="divide-y divide-rule">
          {q.data.data.items.map((v) => (
            <li key={v.player_id}>
              <Link
                href={`/app/players/${v.player_id}/explanation`}
                className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 px-4 py-3 hover:bg-tint"
              >
                <span className="font-semibold">{v.name}</span>
                <span className="score text-right text-lg text-marker">{fmtSigned(v.value_gap_eur, fmtEur)}</span>
                <span className="text-[13px] text-ink-3">
                  {v.position}, market {fmtEur(v.market_value_eur)}
                </span>
                <span className="text-right text-[13px] text-ink-3">model {fmtEur(v.predicted_value_eur)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function OverviewPage() {
  const matches = useAllMatches();
  const teams = useTeams(100);
  const source =
    matches.data?.source === "snapshot" || teams.data?.source === "snapshot" ? "snapshot" : "live";

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Overview"
        description="The finished knockout bracket, the leading scorers, and where the valuation model disagrees most with the market. Click any tie to open it."
        actions={<SourceBadge source={source} />}
      />

      <section aria-label="Knockout bracket">
        {matches.isPending || teams.isPending ? (
          <Skeleton className="h-[560px] w-full" />
        ) : matches.isError ? (
          <ErrorState error={matches.error} onRetry={() => matches.refetch()} />
        ) : (
          <LandingChart matches={matches.data.data} teams={teams.data?.data.items ?? []} appLinks />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopScorers />
        <BiggestGaps />
      </div>
    </div>
  );
}

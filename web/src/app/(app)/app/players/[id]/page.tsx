"use client";

import Link from "next/link";
import { use } from "react";
import { ValueScale } from "@/components/charts/value-scale";
import { Flag } from "@/components/domain/monogram";
import { ProvenanceFooter } from "@/components/domain/provenance";
import { SourceBadge } from "@/components/domain/source-badge";
import { ErrorState } from "@/components/domain/states";
import { StatCard } from "@/components/domain/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { usePlayer, useValuation } from "@/lib/api/queries";
import { featureLabel, featureValue } from "@/lib/features";
import { ageFrom, fmtDate, fmtEur, fmtNum, fmtSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

const POSITION = { GK: "Goalkeeper", DEF: "Defender", MID: "Midfielder", FWD: "Forward" } as Record<string, string>;

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const playerId = Number(id);
  const player = usePlayer(playerId);
  const valuation = useValuation(playerId);

  if (player.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-56" />
      </div>
    );
  }
  if (player.isError) return <ErrorState error={player.error} onRetry={() => player.refetch()} />;

  const p = player.data.data;
  const t = p.tournament;
  const notScored = valuation.isError && valuation.error instanceof ApiError && valuation.error.status === 404;
  const v = valuation.data?.data;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end gap-5 border-b-2 border-ink pb-5">
        <Flag code={p.team.fifa_code} size="xl" label={p.team.name} />
        <div className="min-w-0 flex-1">
          <h1 className="display text-[clamp(2.2rem,5vw,3.25rem)]">{p.name}</h1>
          <p className="mt-2 text-[16px] text-ink-2">
            {POSITION[p.position] ?? p.position} for{" "}
            <Link href={`/app/teams/${p.team.team_id}`} className="font-semibold text-ink underline">
              {p.team.name}
            </Link>
            , plays club football at {p.club.replace(/\.$/, "")}.
          </p>
        </div>
        <SourceBadge source={player.data.source} />
      </header>

      <section aria-labelledby="tournament">
        <h2 id="tournament" className="mb-4 text-xl font-bold">
          At the 2026 World Cup
        </h2>
        {t && t.matches > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Matches" value={t.matches} hint={`${t.starts} as a starter`} />
            <StatCard label="Minutes" value={fmtNum(t.minutes)} />
            <StatCard label="Goals" value={t.goals} tone={t.goals ? "critical" : undefined} />
            <StatCard label="Assists" value={t.assists} />
            <StatCard
              label="Cards"
              value={t.yellow_cards + t.red_cards}
              hint={`${t.yellow_cards} yellow, ${t.red_cards} red`}
            />
          </div>
        ) : (
          <p className="text-[15px] text-ink-2">Named in the squad but didn&rsquo;t play.</p>
        )}
      </section>

      <section aria-labelledby="career">
        <h2 id="career" className="mb-4 text-xl font-bold">
          Profile
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
          <StatCard label="Age" value={ageFrom(p.date_of_birth) ?? ""} hint={`Born ${fmtDate(p.date_of_birth)}`} />
          <StatCard label="Height" value={`${p.height_cm} cm`} />
          <StatCard label="International caps" value={p.caps} />
          <StatCard label="International goals" value={p.international_goals} hint="Career, before the tournament" />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>What the model thinks he&rsquo;s worth</CardTitle>
          {v ? (
            <Link href={`/app/players/${p.player_id}/explanation`} className="text-[14px] font-semibold text-pitch underline">
              Every factor, step by step
            </Link>
          ) : null}
          <CardDescription>
            A gradient-boosted model trained on tournament and profile data, never on the price it is compared with.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {valuation.isPending ? (
            <Skeleton className="h-40" />
          ) : notScored ? (
            <p className="text-[15px] text-ink-2">The current model hasn&rsquo;t scored this player.</p>
          ) : valuation.isError ? (
            <ErrorState error={valuation.error} onRetry={() => valuation.refetch()} />
          ) : v ? (
            <>
              <p className="text-[17px]">
                Gap:{" "}
                <strong className={cn("score text-2xl", v.value_gap_eur >= 0 ? "text-marker" : "text-cool")}>
                  {fmtSigned(v.value_gap_eur, fmtEur)}
                </strong>{" "}
                <span className="text-ink-2">
                  {v.value_gap_eur >= 0 ? "(the model prices him above the market)" : "(the model prices him below the market)"}
                </span>
              </p>
              <ValueScale market={v.market_value_eur} model={v.predicted_value_eur} />
              <div>
                <h3 className="mb-2 text-[15px] font-bold">The five factors that moved his estimate most</h3>
                <ul className="divide-y divide-rule border-y border-rule">
                  {v.top_k.map((c) => (
                    <li key={c.feature_name} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 py-2.5">
                      <span title={c.feature_name}>
                        {featureLabel(c.feature_name)}{" "}
                        <span className="text-[13px] text-ink-3">({featureValue(c.feature_name, c.feature_value)})</span>
                      </span>
                      <span className={cn("score text-right text-lg", c.multiplicative_factor >= 1 ? "text-marker" : "text-cool")}>
                        {c.multiplicative_factor >= 1
                          ? `×${c.multiplicative_factor.toFixed(2)}`
                          : `×${c.multiplicative_factor.toFixed(2)}`}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[13px] text-ink-3">
                  Each factor multiplies the estimate: ×2.00 doubles it, ×0.50 halves it. Profile values are as of the
                  tournament start.
                </p>
              </div>
              <ProvenanceFooter provenance={v} />
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

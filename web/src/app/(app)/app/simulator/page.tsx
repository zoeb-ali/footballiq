"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ArrowsLeftRight } from "@phosphor-icons/react";
import { ProbBars } from "@/components/charts/prob-bars";
import { ScoreMatrix } from "@/components/charts/score-matrix";
import { Flag } from "@/components/domain/monogram";
import { PageHeader } from "@/components/domain/page-header";
import { ErrorState } from "@/components/domain/states";
import { StatCard } from "@/components/domain/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiPost } from "@/lib/api/client";
import { useTeams } from "@/lib/api/queries";
import type { Simulation } from "@/lib/api/types";
import { fmtPct } from "@/lib/format";

// Default fixture: the final (Spain v Argentina), by FIFA code so ids can change.
const DEFAULT_CODES = ["ESP", "ARG"] as const;

function SimulatorInner() {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const teams = useTeams(100);
  const list = (teams.data?.data.items ?? []).filter((t) => t.elo_rating !== null);
  const byCode = (code: string) => String(list.find((t) => t.fifa_code === code)?.team_id ?? "");

  const [a, setA] = useState<string | null>(search.get("home"));
  const [b, setB] = useState<string | null>(search.get("away"));
  const [runs, setRuns] = useState(5000);
  const [seed, setSeed] = useState(42);
  const teamA = a ?? byCode(DEFAULT_CODES[0]);
  const teamB = b ?? byCode(DEFAULT_CODES[1]);

  const sim = useMutation({
    mutationFn: (body: { home_team_id: number; away_team_id: number; n_runs: number; seed: number }) =>
      apiPost<Simulation>("/v1/simulations/match", body),
  });

  const ready = Boolean(teamA && teamB && teamA !== teamB);
  const runsOk = Number.isFinite(runs) && runs >= 100 && runs <= 10000;
  const seedOk = Number.isInteger(seed) && seed >= 0;

  function run() {
    if (!ready || !runsOk || !seedOk) return;
    sim.mutate({ home_team_id: Number(teamA), away_team_id: Number(teamB), n_runs: runs, seed });
    const p = new URLSearchParams({ home: teamA, away: teamB });
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  // Arriving with a fixture (from a match, or the default final): run it once.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current || !ready || !list.length) return;
    autoRan.current = true;
    sim.mutate({ home_team_id: Number(teamA), away_team_id: Number(teamB), n_runs: 5000, seed: 42 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when teams arrive
  }, [ready, list.length]);

  const result = sim.data?.data;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Match simulator"
        description="Plays a fixture thousands of times from the two teams' Elo ratings and this tournament's scoring rate. The same teams and seed always give the same answer, so any number here can be reproduced."
      />

      <Card>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_auto_auto] md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              run();
            }}
          >
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">
              Team A
              <Select value={teamA} onChange={(e) => setA(e.target.value)} disabled={teams.isPending}>
                {list.map((t) => (
                  <option key={t.team_id} value={t.team_id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </label>
            <button
              type="button"
              onClick={() => {
                setA(teamB);
                setB(teamA);
              }}
              aria-label="Swap the two teams"
              className="grid h-11 w-11 cursor-pointer place-items-center self-end justify-self-center rounded-[3px] border border-rule-strong hover:border-ink"
            >
              <ArrowsLeftRight size={18} aria-hidden="true" />
            </button>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">
              Team B
              <Select value={teamB} onChange={(e) => setB(e.target.value)} disabled={teams.isPending}>
                {list.map((t) => (
                  <option key={t.team_id} value={t.team_id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2 md:w-32">
              Runs
              <Input
                type="number"
                inputMode="numeric"
                min={100}
                max={10000}
                step={100}
                value={runs}
                aria-invalid={!runsOk}
                aria-describedby="runs-help"
                onChange={(e) => setRuns(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2 md:w-24">
              Seed
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={seed}
                aria-invalid={!seedOk}
                onChange={(e) => setSeed(Number(e.target.value))}
              />
            </label>
            <Button type="submit" variant="marker" disabled={!ready || !runsOk || !seedOk || sim.isPending}>
              {sim.isPending ? "Simulating…" : "Run simulation"}
            </Button>
          </form>
          <p id="runs-help" className="mt-2 text-[13px] text-ink-3">
            {!ready
              ? "Pick two different teams."
              : !runsOk
                ? "Runs must be between 100 and 10,000."
                : !seedOk
                  ? "The seed must be a whole number, 0 or more."
                  : "More runs narrow the 95% ranges; a different seed shows the run-to-run noise."}
          </p>
        </CardContent>
      </Card>

      {sim.isPending ? (
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-ink-2">
            Simulating. If the API has been asleep, the first run can take up to a minute while it wakes.
          </p>
          <Skeleton className="h-64" />
        </div>
      ) : null}
      {sim.isError ? <ErrorState error={sim.error} onRetry={run} /> : null}

      {result ? (
        <>
          <section aria-label="Result" className="flex flex-col gap-5">
            <h2 className="flex flex-wrap items-center gap-3 text-2xl font-bold">
              <Flag code={result.home.fifa_code} size="md" />
              {result.home.name}
              <span className="text-ink-3">v</span>
              {result.away.name}
              <Flag code={result.away.fifa_code} size="md" />
            </h2>
            <ProbBars simulation={result} />
          </section>

          <div className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
            <StatCard
              label={`${result.home.name} goals per match`}
              value={result.home.lambda_goals.toFixed(2)}
              hint={`Sampled average ${result.home.mean_goals_sampled.toFixed(2)}`}
            />
            <StatCard
              label={`${result.away.name} goals per match`}
              value={result.away.lambda_goals.toFixed(2)}
              hint={`Sampled average ${result.away.mean_goals_sampled.toFixed(2)}`}
            />
            <StatCard
              label={`Elo expected score, ${result.home.name}`}
              value={fmtPct(result.elo_win_expectancy_home, 0)}
              hint={`Ratings ${result.home.elo_rating} v ${result.away.elo_rating}`}
            />
            <StatCard
              label="Goals per match used"
              value={result.goals_per_match_used.toFixed(2)}
              hint={
                result.goal_rate_source === "observed"
                  ? `Observed across ${result.matches_observed} matches of this tournament`
                  : "2022 World Cup average (too few matches observed)"
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Every scoreline</CardTitle>
              <CardDescription>
                {result.n_runs.toLocaleString("en")} runs, seed {result.seed}, method {result.method_version}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreMatrix simulation={result} />
            </CardContent>
          </Card>

          <section aria-labelledby="method" className="border-t-2 border-ink pt-4">
            <h2 id="method" className="text-lg font-bold">
              How it works
            </h2>
            <p className="mt-1 text-[13px] text-ink-3">Sent by the API with every result, so the method travels with the numbers.</p>
            <ul className="mt-3 flex max-w-[75ch] list-disc flex-col gap-1.5 pl-5 text-[15px] leading-relaxed text-ink-2">
              {result.assumptions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <SimulatorInner />
    </Suspense>
  );
}

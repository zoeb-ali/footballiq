"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { ProbBars } from "@/components/charts/prob-bars";
import { Flag } from "@/components/domain/monogram";
import { ErrorState } from "@/components/domain/states";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api/client";
import type { CompletedMatch, Simulation, Team } from "@/lib/api/types";
import { fmtDate, fmtVenue } from "@/lib/format";
import { eloExpectancy, resultNote, winnerId } from "@/lib/tournament";
import { cn } from "@/lib/utils";

/** Two-sided bar: home share from the left, away from the right. */
function SplitBar({ home, away, label }: { home: number; away: number; label: string }) {
  const total = home + away || 1;
  const pct = (home / total) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="score text-lg">{home.toFixed(2)}</span>
        <span className="font-medium text-ink-2">{label}</span>
        <span className="score text-lg">{away.toFixed(2)}</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-[1px] bg-tint" aria-hidden="true">
        <span className="bg-ink" style={{ width: `${pct}%` }} />
        <span className="ml-auto bg-cool" style={{ width: `${100 - pct - 0.6}%` }} />
      </div>
    </div>
  );
}

export function MatchSheet({
  match,
  teams,
  appLinks = true,
  className,
}: {
  match: CompletedMatch;
  teams: Map<number, Team>;
  appLinks?: boolean;
  className?: string;
}) {
  const w = winnerId(match);
  const note = resultNote(match);
  const eh = teams.get(match.home.team_id)?.elo_rating ?? null;
  const ea = teams.get(match.away.team_id)?.elo_rating ?? null;
  const pHome = eh != null && ea != null ? eloExpectancy(eh, ea) : null;
  const sim = useMutation({
    mutationKey: ["sheet-sim", match.match_id],
    mutationFn: () =>
      apiPost<Simulation>("/v1/simulations/match", {
        home_team_id: match.home.team_id,
        away_team_id: match.away.team_id,
        n_runs: 5000,
        seed: 42,
      }),
  });
  // The simulator models 90 minutes. A tie settled in extra time or on
  // penalties was level after 90, so that is the outcome to judge it by.
  const after90: "home" | "draw" | "away" =
    match.score.decided_by !== "regular"
      ? "draw"
      : match.score.home > match.score.away
        ? "home"
        : match.score.home < match.score.away
          ? "away"
          : "draw";
  const favouriteWon =
    pHome != null && w != null && pHome !== 0.5 ? (pHome > 0.5) === (w === match.home.team_id) : null;

  return (
    <article
      className={cn("grid gap-6 border-y-2 border-ink py-5 md:grid-cols-[1.3fr_1fr]", className)}
    >
      <div className="flex flex-col gap-4">
        <p className="text-[13px] font-semibold text-ink-2">
          {match.stage}, {fmtDate(match.date)}, {fmtVenue(match.venue)}
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {[match.home, null, match.away].map((team, i) =>
            team ? (
              <div key={team.team_id} className={cn("flex items-center gap-3", i === 2 && "flex-row-reverse text-right")}>
                <Flag code={team.fifa_code} size="lg" className="hidden sm:inline-block" />
                <Flag code={team.fifa_code} size="md" className="sm:hidden" />
                <div className="min-w-0">
                  <p className={cn("text-lg font-bold leading-tight", w !== team.team_id && "text-ink-3")}>
                    {appLinks ? (
                      <Link href={`/app/teams/${team.team_id}`} className="hover:underline">
                        {team.name}
                      </Link>
                    ) : (
                      team.name
                    )}
                  </p>
                  {w === team.team_id ? <p className="whitespace-nowrap text-[13px] font-semibold text-marker">Went through</p> : null}
                </div>
              </div>
            ) : (
              <p key="score" className="score whitespace-nowrap text-center text-[clamp(2.4rem,6vw,3.5rem)] leading-none">
                {match.score.home}
                <span className="px-1 text-ink-3">–</span>
                {match.score.away}
              </p>
            ),
          )}
        </div>
        {note ? <p className="text-center text-[15px] font-semibold text-marker">{note}</p> : null}
        <SplitBar home={match.xg.home} away={match.xg.away} label="Expected goals" />
      </div>

      <div className="flex flex-col gap-3 border-t border-rule pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
        <h3 className="text-[15px] font-bold">Before kick-off</h3>
        {pHome != null ? (
          <>
            <p className="text-[15px] leading-relaxed text-ink-2">
              On pre-tournament Elo ratings ({eh} vs {ea}), {match.home.name} had a{" "}
              <strong className="text-ink">{Math.round(pHome * 100)}%</strong> expected score against{" "}
              {match.away.name}.{" "}
              {favouriteWon === null
                ? null
                : favouriteWon
                  ? "The favourite went through."
                  : "The underdog went through."}
            </p>
            <p className="text-[13px] leading-snug text-ink-3">
              Elo expectancy counts a draw as half a win, so it is not a win probability. The simulator turns it
              into win, draw and loss chances.
            </p>
          </>
        ) : (
          <p className="text-[15px] text-ink-2">No Elo rating on file for one of these teams.</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
          <Button variant="marker" onClick={() => sim.mutate()} disabled={sim.isPending}>
            {sim.isPending ? "Simulating 5,000 matches…" : sim.data ? "Run again" : "Simulate this tie"}
          </Button>
          {appLinks ? (
            <Link
              href={`/app/simulator?home=${match.home.team_id}&away=${match.away.team_id}`}
              className="text-[15px] font-semibold text-pitch underline"
            >
              Open in the simulator
            </Link>
          ) : null}
        </div>
      </div>

      <div className="md:col-span-2" aria-live="polite">
        {sim.isPending ? (
          <p className="text-[15px] text-ink-2">
            Running 5,000 simulated matches. If the API has been asleep this first run can take up to a minute.
          </p>
        ) : null}
        {sim.isError ? <ErrorState error={sim.error} onRetry={() => sim.mutate()} /> : null}
        {sim.data ? (
          <div className="flex flex-col gap-2 border-t border-rule pt-4">
            <h3 className="text-[15px] font-bold">
              Simulator: result after 90 minutes{" "}
              <span className="font-normal text-ink-3">(5,000 runs, seed 42)</span>
            </h3>
            <ProbBars simulation={sim.data.data} actual={after90} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

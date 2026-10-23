"use client";

import { Suspense, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LandingChart } from "@/components/bracket/landing-chart";
import { MatchSheet } from "@/components/bracket/match-sheet";
import { GroupTables } from "@/components/domain/group-tables";
import { Flag } from "@/components/domain/monogram";
import { PageHeader } from "@/components/domain/page-header";
import { SourceBadge } from "@/components/domain/source-badge";
import { ErrorState } from "@/components/domain/states";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllMatches, useTeams } from "@/lib/api/queries";
import type { CompletedMatch, Match, Team } from "@/lib/api/types";
import { fmtDate, fmtVenue } from "@/lib/format";
import { isCompleted, resultNote, winnerId } from "@/lib/tournament";
import { cn } from "@/lib/utils";

const VIEWS = [
  { id: "knockout", label: "Knockout bracket" },
  { id: "groups", label: "Group tables" },
  { id: "results", label: "All results" },
] as const;
type View = (typeof VIEWS)[number]["id"];

function ResultRow({
  match,
  open,
  onToggle,
  teams,
}: {
  match: CompletedMatch;
  open: boolean;
  onToggle: () => void;
  teams: Map<number, Team>;
}) {
  const w = winnerId(match);
  const note = resultNote(match);
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="grid w-full cursor-pointer grid-cols-[1fr_auto_1fr] items-center gap-3 px-2 py-3 text-left hover:bg-tint sm:px-4"
      >
        <span className="flex min-w-0 items-center justify-end gap-2 text-right">
          <span className={cn("truncate", w === match.home.team_id ? "font-bold" : w ? "text-ink-2" : "font-semibold")}>
            {match.home.name}
          </span>
          <Flag code={match.home.fifa_code} />
        </span>
        <span className="flex flex-col items-center">
          <span className="score whitespace-nowrap text-xl">
            {match.score.home}–{match.score.away}
          </span>
          {note ? <span className="text-[12px] font-semibold text-marker">{note.replace("after extra time", "aet")}</span> : null}
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <Flag code={match.away.fifa_code} />
          <span className={cn("truncate", w === match.away.team_id ? "font-bold" : w ? "text-ink-2" : "font-semibold")}>
            {match.away.name}
          </span>
        </span>
        <span className="col-span-3 text-center text-[12px] text-ink-3">
          {match.stage}, {fmtVenue(match.venue)}. xG {match.xg.home.toFixed(2)}–{match.xg.away.toFixed(2)}
        </span>
      </button>
      {open ? (
        <div className="px-2 pb-4 sm:px-4">
          <MatchSheet match={match} teams={teams} />
        </div>
      ) : null}
    </li>
  );
}

function AllResults({ matches, teams }: { matches: Match[]; teams: Map<number, Team> }) {
  const [stage, setStage] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const stages = useMemo(() => [...new Set(matches.map((m) => m.stage))], [matches]);
  const byDay = useMemo(() => {
    const map = new Map<string, CompletedMatch[]>();
    for (const m of matches) {
      if (!isCompleted(m) || (stage && m.stage !== stage)) continue;
      const list = map.get(m.date) ?? [];
      list.push(m);
      map.set(m.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [matches, stage]);

  return (
    <div className="flex flex-col gap-6">
      <label className="flex w-fit flex-col gap-1 text-[13px] font-semibold text-ink-2">
        Stage
        <Select value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">Every stage</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </label>
      {byDay.map(([day, list]) => (
        <section key={day} aria-labelledby={`d-${day}`}>
          <h3 id={`d-${day}`} className="border-b-2 border-ink pb-1 text-[15px] font-bold">
            {fmtDate(day)}
          </h3>
          <ul className="divide-y divide-rule">
            {list.map((m) => (
              <ResultRow
                key={m.match_id}
                match={m}
                teams={teams}
                open={open === m.match_id}
                onToggle={() => setOpen(open === m.match_id ? null : m.match_id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MatchesInner() {
  const matches = useAllMatches();
  const teams = useTeams(100);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const view = (VIEWS.find((v) => v.id === search.get("view"))?.id ?? "knockout") as View;
  const teamList = useMemo(() => teams.data?.data.items ?? [], [teams.data]);
  const teamMap = useMemo(() => new Map(teamList.map((t) => [t.team_id, t])), [teamList]);
  const source =
    matches.data?.source === "snapshot" || teams.data?.source === "snapshot" ? "snapshot" : "live";

  function setView(v: View) {
    const p = new URLSearchParams(search.toString());
    p.set("view", v);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Matches"
        description="All 104 matches: the knockout bracket, the group tables worked out from the results, and every score by day. Open any match for its expected goals and a simulation."
        actions={<SourceBadge source={source} />}
      />
      <div role="tablist" aria-label="View" className="flex flex-wrap gap-1">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={cn(
              "h-11 cursor-pointer rounded-[3px] border px-4 text-[15px] font-semibold",
              view === v.id ? "border-ink bg-ink text-paper" : "border-rule-strong text-ink-2 hover:border-ink",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {matches.isPending || teams.isPending ? (
          <Skeleton className="h-[520px] w-full" />
        ) : matches.isError ? (
          <ErrorState error={matches.error} onRetry={() => matches.refetch()} />
        ) : view === "knockout" ? (
          <LandingChart matches={matches.data.data} teams={teamList} appLinks />
        ) : view === "groups" ? (
          <GroupTables matches={matches.data.data} teams={teamList} />
        ) : (
          <AllResults matches={matches.data.data} teams={teamMap} />
        )}
      </div>
    </div>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[520px] w-full" />}>
      <MatchesInner />
    </Suspense>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { CompletedMatch, Match, Team } from "@/lib/api/types";
import { buildBracket } from "@/lib/tournament";
import { KnockoutBracket } from "./bracket";
import { MatchSheet } from "./match-sheet";

/** The interactive chart: click any tie, its sheet opens beneath. */
export function LandingChart({
  matches,
  teams,
  appLinks = false,
}: {
  matches: Match[];
  teams: Team[];
  appLinks?: boolean;
}) {
  const bracket = useMemo(() => buildBracket(matches), [matches]);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.team_id, t])), [teams]);
  const [selected, setSelected] = useState<CompletedMatch | null>(bracket?.final.match ?? null);

  if (!bracket) {
    return <p className="text-ink-2">The knockout stage isn&rsquo;t available right now.</p>;
  }
  return (
    <div className="flex flex-col gap-8">
      <KnockoutBracket
        bracket={bracket}
        selectedId={selected?.match_id ?? null}
        onSelect={(m) => {
          setSelected(m);
          requestAnimationFrame(() =>
            document.getElementById("match-sheet")?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
          );
        }}
      />
      <div id="match-sheet" className="scroll-mt-24">
        {selected ? <MatchSheet key={selected.match_id} match={selected} teams={teamMap} appLinks={appLinks} /> : null}
      </div>
    </div>
  );
}

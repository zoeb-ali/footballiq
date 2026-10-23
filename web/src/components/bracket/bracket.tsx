"use client";

/**
 * The wall chart. Two-sided like the printed poster on wide screens (halves
 * meet at the final in the middle), one-sided and horizontally scrollable on
 * narrow ones. Geometry is fixed and computed, so connector lines are exact.
 * The champion's route is inked in marker red; results "write in" once.
 */

import { useState } from "react";
import type { CompletedMatch } from "@/lib/api/types";
import { Flag } from "@/components/domain/monogram";
import { KNOCKOUT_ROUNDS, winnerId, type Bracket } from "@/lib/tournament";
import { cn } from "@/lib/utils";

const ROUND_SHORT = ["Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final"];

interface Geometry {
  W: number; // box width
  G: number; // gutter between columns
  S: number; // slot height per Round of 32 match
  B: number; // box height
  header: number; // room for round labels
}

const SPLIT: Geometry = { W: 112, G: 18, S: 66, B: 54, header: 34 };
const SINGLE: Geometry = { W: 132, G: 26, S: 66, B: 54, header: 34 };

function MatchBox({
  match,
  x,
  y,
  geo,
  champion,
  selected,
  onSelect,
  delay,
  label,
  fluid = false,
}: {
  match: CompletedMatch;
  x: number;
  y: number;
  geo: Geometry;
  champion: number | null;
  selected: boolean;
  onSelect?: (m: CompletedMatch) => void;
  delay: number;
  label?: string;
  fluid?: boolean;
}) {
  const w = winnerId(match);
  const rows = [
    { team: match.home, goals: match.score.home, pens: match.score.penalties?.home },
    { team: match.away, goals: match.score.away, pens: match.score.penalties?.away },
  ];
  const note =
    match.score.decided_by === "penalties" ? "pens" : match.score.decided_by === "aet" ? "aet" : null;
  const winnerName = w === match.home.team_id ? match.home.name : match.away.name;
  return (
    <button
      type="button"
      onClick={() => onSelect?.(match)}
      aria-pressed={selected}
      aria-label={`${match.stage}: ${match.home.name} ${match.score.home}, ${match.away.name} ${match.score.away}${
        match.score.penalties ? `, ${match.score.penalties.home}–${match.score.penalties.away} on penalties` : ""
      }. ${winnerName} went through.`}
      style={{ left: x, top: y, width: fluid ? "100%" : geo.W, height: geo.B }}
      className={cn(
        "absolute flex cursor-pointer flex-col justify-center rounded-[2px] border bg-sheet text-left transition-[border-color,box-shadow] duration-150",
        selected ? "border-ink shadow-[0_0_0_1px_var(--ink)]" : "border-rule-strong hover:border-ink",
      )}
    >
      {label ? (
        <span className="absolute -top-[22px] left-0 text-xs font-semibold text-ink-2">{label}</span>
      ) : null}
      {rows.map(({ team, goals, pens }) => {
        const won = w === team.team_id;
        const onChampionRoute = won && champion === team.team_id;
        return (
          <span key={team.team_id} className="flex h-[25px] items-center gap-1.5 px-1.5" title={team.name}>
            <Flag code={team.fifa_code} size="xs" />
            <span className={cn("code flex-1 text-[15px]", won ? "text-ink" : "text-ink-3")}>{team.fifa_code}</span>
            {note === "pens" && pens != null ? (
              <span className={cn("text-[12px] tabular-nums", won ? "text-ink-2" : "text-ink-3")}>({pens})</span>
            ) : null}
            {note === "aet" && won ? (
              <span className="text-[12px] font-semibold text-ink-3" title="after extra time">
                aet
              </span>
            ) : null}
            <span
              className={cn(
                "score write-in w-4 text-right text-[17px]",
                won ? (onChampionRoute ? "text-marker" : "text-ink") : "text-ink-3",
              )}
              style={{ animationDelay: `${delay}ms` }}
            >
              {goals}
            </span>
          </span>
        );
      })}
    </button>
  );
}

type Placed = { match: CompletedMatch; x: number; cy: number; side: "L" | "R" | "C" };

function layout(bracket: Bracket, geo: Geometry, split: boolean): { placed: Placed[][]; width: number; height: number } {
  const { W, G, S, header } = geo;
  const placed: Placed[][] = bracket.rounds.map(() => []);
  if (!split) {
    bracket.rounds.forEach((ms, k) => {
      ms.forEach((m, i) => {
        placed[k].push({ match: m, x: k * (W + G), cy: header + (i + 0.5) * 2 ** k * S, side: "L" });
      });
    });
    return { placed, width: 5 * W + 4 * G, height: header + 16 * S };
  }
  const half = 8 * S;
  bracket.rounds.forEach((ms, k) => {
    if (k === 4) {
      placed[k].push({ match: ms[0], x: 4 * (W + G), cy: header + half / 2, side: "C" });
      return;
    }
    const n = ms.length / 2;
    ms.forEach((m, i) => {
      const left = i < n;
      const j = left ? i : i - n;
      placed[k].push({
        match: m,
        x: (left ? k : 8 - k) * (W + G),
        cy: header + (j + 0.5) * 2 ** k * S,
        side: left ? "L" : "R",
      });
    });
  });
  return { placed, width: 9 * W + 8 * G, height: header + half };
}

function Connectors({ placed, geo, champion }: { placed: Placed[][]; geo: Geometry; champion: number | null }) {
  const paths: { d: string; won: boolean }[] = [];
  for (let k = 1; k < placed.length; k++) {
    const parents = placed[k];
    const kids = placed[k - 1];
    parents.forEach((p) => {
      const teamIds = [p.match.home.team_id, p.match.away.team_id];
      for (const tid of teamIds) {
        const child = kids.find((c) => winnerId(c.match) === tid);
        if (!child) continue;
        const fromRight = child.side !== "R"; // child box is left of the parent
        const childEdge = fromRight ? child.x + geo.W : child.x;
        const parentEdge = fromRight ? p.x : p.x + geo.W;
        const mid = (childEdge + parentEdge) / 2;
        paths.push({
          d: `M${childEdge} ${child.cy} H${mid} V${p.cy} H${parentEdge}`,
          won: champion === tid,
        });
      }
    });
  }
  // draw the champion's route last so it sits on top
  paths.sort((a, b) => Number(a.won) - Number(b.won));
  return (
    <>
      {paths.map((p, i) => (
        <path key={i} d={p.d} className={cn("bracket-line", p.won && "won")} />
      ))}
    </>
  );
}

function BracketCanvas({
  bracket,
  split,
  selectedId,
  onSelect,
}: {
  bracket: Bracket;
  split: boolean;
  selectedId: number | null;
  onSelect?: (m: CompletedMatch) => void;
}) {
  const geo = split ? SPLIT : SINGLE;
  const { placed, width, height } = layout(bracket, geo, split);
  const champion = winnerId(bracket.final.match);
  const thirdY = height + 46;
  const totalH = bracket.thirdPlace ? thirdY + geo.B + 10 : height + 20;

  const roundLabels: { text: string; x: number }[] = [];
  for (let k = 0; k < 5; k++) {
    if (split && k < 4) {
      roundLabels.push({ text: ROUND_SHORT[k], x: k * (geo.W + geo.G) });
      roundLabels.push({ text: ROUND_SHORT[k], x: (8 - k) * (geo.W + geo.G) });
    } else if (!split || k === 4) {
      roundLabels.push({ text: ROUND_SHORT[k], x: (split ? 4 : k) * (geo.W + geo.G) });
    }
  }

  return (
    <div className="relative" style={{ width, height: totalH }}>
      {roundLabels.map((l, i) => (
        <span
          key={i}
          className={cn("absolute top-0 text-[13px] font-semibold text-ink-2", l.text === "Final" && "text-marker")}
          style={{ left: l.x, width: geo.W }}
        >
          {l.text}
        </span>
      ))}
      <svg className="pointer-events-none absolute inset-0" width={width} height={totalH} aria-hidden="true">
        <Connectors placed={placed} geo={geo} champion={champion} />
      </svg>
      {placed.flatMap((col, k) =>
        col.map((p) => (
          <MatchBox
            key={p.match.match_id}
            match={p.match}
            x={p.x}
            y={p.cy - geo.B / 2}
            geo={geo}
            champion={champion}
            selected={selectedId === p.match.match_id}
            onSelect={onSelect}
            delay={150 + k * 140}
          />
        )),
      )}
      {bracket.thirdPlace ? (
        <MatchBox
          match={bracket.thirdPlace}
          x={split ? 4 * (geo.W + geo.G) : 4 * (geo.W + geo.G)}
          y={split ? thirdY : height - geo.S * 3}
          geo={geo}
          champion={champion}
          selected={selectedId === bracket.thirdPlace.match_id}
          onSelect={onSelect}
          delay={800}
          label="Third place"
        />
      ) : null}
    </div>
  );
}

function RoundList({
  bracket,
  selectedId,
  onSelect,
}: {
  bracket: Bracket;
  selectedId: number | null;
  onSelect?: (m: CompletedMatch) => void;
}) {
  const [round, setRound] = useState(4);
  const champion = winnerId(bracket.final.match);
  const matches = round === 4 && bracket.thirdPlace ? [...bracket.rounds[4], bracket.thirdPlace] : bracket.rounds[round];
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Knockout round" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {ROUND_SHORT.map((label, k) => (
          <button
            key={label}
            role="tab"
            aria-selected={round === k}
            onClick={() => setRound(k)}
            className={cn(
              "h-10 shrink-0 cursor-pointer rounded-[3px] border px-3 text-[14px] font-semibold",
              round === k ? "border-ink bg-ink text-paper" : "border-rule-strong text-ink-2",
            )}
          >
            {label === "Quarter-finals" ? "Quarters" : label === "Semi-finals" ? "Semis" : label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
      <ul className="grid grid-cols-2 gap-3">
        {matches.map((m, i) => (
          <li key={m.match_id} className="relative" style={{ height: SINGLE.B + (m === bracket.thirdPlace ? 22 : 0) }}>
            <MatchBox
              match={m}
              x={0}
              y={m === bracket.thirdPlace ? 22 : 0}
              geo={SINGLE}
              champion={champion}
              selected={selectedId === m.match_id}
              onSelect={onSelect}
              delay={i * 40}
              label={m === bracket.thirdPlace ? "Third place" : undefined}
              fluid
            />
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}

export function KnockoutBracket({
  bracket,
  selectedId,
  onSelect,
  className,
}: {
  bracket: Bracket;
  selectedId: number | null;
  onSelect?: (m: CompletedMatch) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      {/* Wide screens: the poster, two halves meeting at the final. */}
      <div className="hidden justify-center xl:flex">
        <BracketCanvas bracket={bracket} split selectedId={selectedId} onSelect={onSelect} />
      </div>
      {/* Narrow screens: one side, scroll sideways through the rounds. */}
      {/* Phones: one round at a time, starting at the final. */}
      <div className="md:hidden">
        <RoundList bracket={bracket} selectedId={selectedId} onSelect={onSelect} />
      </div>
      <div
        className="hidden overflow-x-auto overscroll-x-contain pb-4 md:block xl:hidden"
        role="region"
        aria-label="Knockout bracket, scroll sideways for later rounds"
        tabIndex={0}
      >
        <BracketCanvas bracket={bracket} split={false} selectedId={selectedId} onSelect={onSelect} />
      </div>
    </div>
  );
}

export { KNOCKOUT_ROUNDS };

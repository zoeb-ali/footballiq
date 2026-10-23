/**
 * Tournament structure derived from match results alone.
 *
 * The API has no "this match feeds that one" field, but a knockout bracket is
 * fully determined by its results: each finalist won a semi-final, each
 * semi-finalist won a quarter-final, and so on. Walking back from the final
 * rebuilds the tree in printed order (each half top-to-bottom).
 */

import type { CompletedMatch, Match, Team } from "@/lib/api/types";

export const KNOCKOUT_ROUNDS = ["Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final"] as const;
export type KnockoutRound = (typeof KNOCKOUT_ROUNDS)[number];

export function isCompleted(m: Match): m is CompletedMatch {
  return m.status === "Completed";
}

/** Team id that went through, or null (group draw / unplayed). */
export function winnerId(m: Match): number | null {
  if (!isCompleted(m) || !m.score.winner) return null;
  return m.score.winner === "home" ? m.home.team_id : m.away.team_id;
}

export interface BracketNode {
  match: CompletedMatch;
  round: number; // 0 = Round of 32 ... 4 = Final
  children: [BracketNode, BracketNode] | null;
}

export interface Bracket {
  final: BracketNode;
  thirdPlace: CompletedMatch | null;
  /** Leaves (Round of 32) in printed order, top to bottom. */
  rounds: CompletedMatch[][]; // rounds[k] in printed order
  complete: boolean;
}

/**
 * Rebuild the knockout tree. Returns null when the knockout stage is not
 * complete enough to draw (no completed final).
 */
export function buildBracket(matches: Match[]): Bracket | null {
  const byRound = new Map<string, CompletedMatch[]>();
  for (const m of matches) {
    if (!isCompleted(m) || !m.is_knockout) continue;
    const list = byRound.get(m.stage) ?? [];
    list.push(m);
    byRound.set(m.stage, list);
  }
  const final = byRound.get("Final")?.[0];
  if (!final) return null;

  function feeder(roundIdx: number, teamId: number): CompletedMatch | undefined {
    if (roundIdx < 0) return undefined;
    return (byRound.get(KNOCKOUT_ROUNDS[roundIdx]) ?? []).find((m) => winnerId(m) === teamId);
  }

  function build(match: CompletedMatch, round: number): BracketNode {
    if (round === 0) return { match, round, children: null };
    const a = feeder(round - 1, match.home.team_id);
    const b = feeder(round - 1, match.away.team_id);
    return {
      match,
      round,
      children: a && b ? [build(a, round - 1), build(b, round - 1)] : null,
    };
  }

  const root = build(final, KNOCKOUT_ROUNDS.length - 1);
  const rounds: CompletedMatch[][] = KNOCKOUT_ROUNDS.map(() => []);
  let complete = true;
  (function walk(node: BracketNode) {
    if (node.children) {
      walk(node.children[0]);
      walk(node.children[1]);
    } else if (node.round > 0) {
      complete = false;
    }
    rounds[node.round].push(node.match);
  })(root);

  const thirdStage = [...byRound.keys()].find((s) => /third/i.test(s));
  return {
    final: root,
    thirdPlace: thirdStage ? (byRound.get(thirdStage)?.[0] ?? null) : null,
    rounds,
    complete: complete && rounds[0].length === 16,
  };
}

export interface GroupRow {
  team: { team_id: number; name: string; fifa_code: string };
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

/** Group tables from group-stage results: 3 for a win, 1 for a draw. */
export function groupTables(matches: Match[], teams: Team[]): Map<string, GroupRow[]> {
  const rows = new Map<number, GroupRow>();
  const groupOf = new Map<number, string>();
  for (const t of teams) {
    if (!t.group_letter) continue;
    groupOf.set(t.team_id, t.group_letter);
    rows.set(t.team_id, { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
  }
  for (const m of matches) {
    if (m.is_knockout || !isCompleted(m)) continue;
    const h = rows.get(m.home.team_id);
    const a = rows.get(m.away.team_id);
    if (!h || !a) continue;
    h.p++;
    a.p++;
    h.gf += m.score.home;
    h.ga += m.score.away;
    a.gf += m.score.away;
    a.ga += m.score.home;
    if (m.score.home > m.score.away) {
      h.w++;
      h.pts += 3;
      a.l++;
    } else if (m.score.home < m.score.away) {
      a.w++;
      a.pts += 3;
      h.l++;
    } else {
      h.d++;
      a.d++;
      h.pts++;
      a.pts++;
    }
  }
  const tables = new Map<string, GroupRow[]>();
  for (const [teamId, row] of rows) {
    const g = groupOf.get(teamId)!;
    const list = tables.get(g) ?? [];
    list.push(row);
    tables.set(g, list);
  }
  for (const list of tables.values()) {
    list.sort(
      (x, y) =>
        y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf || x.team.name.localeCompare(y.team.name),
    );
  }
  return new Map([...tables.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/** Standard Elo expectancy for `a` against `b` (scale 400, neutral venue). */
export function eloExpectancy(a: number, b: number): number {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

export interface FavouriteRecord {
  ties: number;
  favouriteWent: number;
  biggestUpset: { match: CompletedMatch; underdogChance: number } | null;
}

/**
 * How often the pre-tournament Elo favourite went through in the knockouts:
 * the simplest honest benchmark for any match model on this site.
 */
export function favouriteRecord(matches: Match[], teams: Team[]): FavouriteRecord {
  const elo = new Map(teams.map((t) => [t.team_id, t.elo_rating ?? null]));
  let ties = 0;
  let favouriteWent = 0;
  let biggestUpset: FavouriteRecord["biggestUpset"] = null;
  for (const m of matches) {
    if (!m.is_knockout || !isCompleted(m) || /third/i.test(m.stage)) continue;
    const eh = elo.get(m.home.team_id);
    const ea = elo.get(m.away.team_id);
    const w = winnerId(m);
    if (eh == null || ea == null || w == null || eh === ea) continue;
    ties++;
    const favId = eh > ea ? m.home.team_id : m.away.team_id;
    if (w === favId) {
      favouriteWent++;
    } else {
      const winnerElo = w === m.home.team_id ? eh : ea;
      const loserElo = w === m.home.team_id ? ea : eh;
      const chance = eloExpectancy(winnerElo, loserElo);
      if (!biggestUpset || chance < biggestUpset.underdogChance) biggestUpset = { match: m, underdogChance: chance };
    }
  }
  return { ties, favouriteWent, biggestUpset };
}

export function resultNote(m: CompletedMatch): string | null {
  if (m.score.decided_by === "penalties" && m.score.penalties) {
    return `${m.score.penalties.home}–${m.score.penalties.away} on penalties`;
  }
  if (m.score.decided_by === "aet") return "after extra time";
  return null;
}

const FINISH_ORDER = [
  "Champions",
  "Runners-up",
  "Third place",
  "Fourth place",
  "Quarter-finals",
  "Round of 16",
  "Round of 32",
  "Group stage",
] as const;
export type Finish = (typeof FINISH_ORDER)[number];

export function finishRank(f: Finish): number {
  return FINISH_ORDER.indexOf(f);
}

/** How far each team got, read off the results. */
export function finishes(matches: Match[]): Map<number, Finish> {
  const out = new Map<number, Finish>();
  const reached = (teamId: number, f: Finish) => {
    const cur = out.get(teamId);
    if (!cur || finishRank(f) < finishRank(cur)) out.set(teamId, f);
  };
  for (const m of matches) {
    const away = m.away.kind === "team" ? m.away.team_id : null;
    const ids = away == null ? [m.home.team_id] : [m.home.team_id, away];
    const w = winnerId(m);
    for (const id of ids) {
      if (!m.is_knockout) reached(id, "Group stage");
      else if (m.stage === "Round of 32") reached(id, "Round of 32");
      else if (m.stage === "Round of 16") reached(id, "Round of 16");
      else if (m.stage === "Quarter-finals") reached(id, "Quarter-finals");
      else if (m.stage === "Final") reached(id, w === id ? "Champions" : "Runners-up");
      else if (/third/i.test(m.stage)) reached(id, w === id ? "Third place" : "Fourth place");
    }
  }
  return out;
}

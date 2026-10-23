/**
 * Server-side reads for statically rendered pages (landing). Goes through the
 * same upstreamFetch as the proxy, so a sleeping API falls back to the
 * labelled snapshot instead of breaking the page.
 */

import "server-only";
import { upstreamFetch } from "./server";
import type { Match, Paginated, Team } from "./types";

export interface Loaded<T> {
  data: T;
  source: "live" | "snapshot";
}

async function getJson<T>(path: string): Promise<Loaded<T> | null> {
  try {
    const r = await upstreamFetch(path, { revalidate: 3600 });
    if (r.status !== 200) return null;
    return { data: JSON.parse(r.body) as T, source: r.source };
  } catch {
    return null;
  }
}

/** All matches (the API caps pages at 100; the tournament has 104). */
export async function getAllMatches(): Promise<Loaded<Match[]> | null> {
  const first = await getJson<Paginated<Match>>("/v1/matches?limit=100");
  if (!first) return null;
  const items = [...first.data.items];
  let source = first.source;
  for (let offset = 100; offset < first.data.total; offset += 100) {
    const page = await getJson<Paginated<Match>>(`/v1/matches?limit=100&offset=${offset}`);
    if (!page) break;
    items.push(...page.data.items);
    if (page.source === "snapshot") source = "snapshot";
  }
  return { data: items, source };
}

export async function getTeams(): Promise<Loaded<Team[]> | null> {
  const r = await getJson<Paginated<Team>>("/v1/teams?limit=100");
  return r ? { data: r.data.items, source: r.source } : null;
}

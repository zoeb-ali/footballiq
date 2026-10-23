#!/usr/bin/env node
/**
 * Capture REAL API responses as the fallback the site serves while the
 * free-tier API sleeps (blueprint §11). Crawls every GET the frontend can
 * make: list pages and their sort/filter variants, then every player, team
 * and nation detail discovered from those lists.
 *
 *   FIQ_API_URL=https://…onrender.com FIQ_API_KEY=… node scripts/capture-snapshots.mjs
 *
 * Never invents data: any failed request fails the run. Everything lands in
 * one gzipped bundle (snapshots/bundle.json.gz), keyed by the same
 * snapshotKey() the server reads with, so the two cannot drift.
 * /health and /ready are deliberately never captured.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { snapshotKey } from "../src/lib/api/snapshot-key.mjs";

const BASE = process.env.FIQ_API_URL?.replace(/\/$/, "");
const KEY = process.env.FIQ_API_KEY;
if (!BASE || !KEY) {
  console.error("FIQ_API_URL and FIQ_API_KEY are required");
  process.exit(1);
}

const outDir = path.join(process.cwd(), "snapshots");
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const bundle = {};
let captured = 0;
let failed = 0;

async function get(p) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const resp = await fetch(`${BASE}${p}`, { headers: { "X-API-Key": KEY } });
    if (resp.ok) {
      const body = await resp.text();
      bundle[snapshotKey(p)] = body;
      captured++;
      return JSON.parse(body);
    }
    if (resp.status < 500 || attempt === 3) {
      console.error(`FAIL ${p} -> ${resp.status}`);
      failed++;
      return null;
    }
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
  return null;
}

async function pages(base, total, size, extra = "") {
  const sep = base.includes("?") ? "&" : "?";
  const out = [];
  for (let o = 0; o < total; o += size) out.push(await get(`${base}${sep}limit=${size}&offset=${o}${extra}`));
  return out;
}

// Pool: keep a handful of requests in flight for the 3,700+ detail calls.
async function pool(items, fn, width = 8) {
  let i = 0;
  await Promise.all(
    Array.from({ length: width }, async () => {
      while (i < items.length) {
        const item = items[i++];
        await fn(item);
      }
    }),
  );
}

// Teams and matches
const teams = (await get("/v1/teams?limit=100"))?.items ?? [];
const matchesFirst = await get("/v1/matches?limit=100");
if (matchesFirst) await pages("/v1/matches", matchesFirst.total, 100);

// Players: default list, leaderboards, search index, filters
const playersFirst = await get("/v1/players?limit=50");
const totalPlayers = playersFirst?.total ?? 0;
await pages("/v1/players", totalPlayers, 50);
await pages("/v1/players", totalPlayers, 100);
for (const sort of ["goals", "assists", "minutes"]) {
  await get(`/v1/players?sort=${sort}&limit=10`);
  await pages(`/v1/players?sort=${sort}`, totalPlayers, 50);
}
for (const pos of ["GK", "DEF", "MID", "FWD"]) {
  const first = await get(`/v1/players?position=${pos}&limit=50`);
  if (first) await pages(`/v1/players?position=${pos}`, first.total, 50);
}
await pool(teams, async (t) => {
  await get(`/v1/players?team_id=${t.team_id}&limit=40`);
  await get(`/v1/players?team_id=${t.team_id}&limit=50`);
});

// Valuations: every sort/order the UI offers, plus the CSV export pages
for (const sort of ["value_gap", "predicted_value", "market_value"]) {
  for (const order of ["desc", "asc"]) {
    await pages(`/v1/valuations?sort=${sort}&order=${order}`, totalPlayers, 50);
    await pages(`/v1/valuations?sort=${sort}&order=${order}`, totalPlayers, 100);
  }
}
await get("/v1/valuations?sort=value_gap&order=desc&limit=6");

// Graph and model
const flowFirst = await get("/v1/graph/talent-flow?limit=100");
if (flowFirst) await pages("/v1/graph/talent-flow", flowFirst.total, 100);
await get("/v1/graph/clubs?limit=20");
await get("/v1/graph/clubs?limit=50");
await get("/v1/models/performance");

// Details: every team, nation and player
await pool(teams, async (t) => {
  await get(`/v1/teams/${t.team_id}`);
  await get(`/v1/graph/nations/${t.team_id}/supply-concentration?top=10`);
});
const playerIds = [];
for (let o = 0; o < totalPlayers; o += 100) {
  const page = await fetch(`${BASE}/v1/players?limit=100&offset=${o}`, { headers: { "X-API-Key": KEY } }).then((r) => r.json());
  playerIds.push(...page.items.map((p) => p.player_id));
}
await pool(playerIds, async (id) => {
  await get(`/v1/players/${id}`);
  await get(`/v1/players/${id}/valuation`);
  await get(`/v1/players/${id}/valuation/explanation`);
});

const gz = gzipSync(JSON.stringify({ captured_at: new Date().toISOString(), entries: bundle }), { level: 9 });
await writeFile(path.join(outDir, "bundle.json.gz"), gz);
console.log(
  `captured ${captured} responses -> snapshots/bundle.json.gz (${(gz.length / 1e6).toFixed(1)} MB)` +
    (failed ? `, ${failed} FAILED` : ""),
);
if (failed) process.exit(1);

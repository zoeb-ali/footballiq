/**
 * Server-side API access — the only module that knows the upstream URL and
 * API key (frontend blueprint §7/§11). Never imported from client code.
 *
 * Fallback contract: try live (bounded timeout) → verified snapshot → typed
 * failure. The response is always labeled with its source; degraded is
 * allowed, dishonest is not. Health/readiness are never served from a
 * snapshot (see snapshots.ts), so the status light reflects reality.
 */

import "server-only";
import { readSnapshot } from "./snapshots";

// Reads: a sleeping free-tier API takes 30-60 s to wake, so waiting longer than
// a few seconds only delays the snapshot the visitor will get anyway. The
// request still reaches Render and starts the wake-up.
const READ_TIMEOUT_MS = 3_500;
// Writes (simulator, analyst) have no snapshot; give a cold start room.
const WRITE_TIMEOUT_MS = 25_000;

export interface UpstreamResult {
  status: number;
  body: string;
  source: "live" | "snapshot";
  retryAfter?: string;
}

function upstreamBase(): string {
  const url = process.env.FIQ_API_URL;
  if (!url) throw new Error("FIQ_API_URL is not configured");
  return url.replace(/\/$/, "");
}

function unavailable(detail: string): UpstreamResult {
  return {
    status: 503,
    body: JSON.stringify({
      type: "about:blank",
      title: "Upstream unavailable",
      status: 503,
      detail,
    }),
    source: "live",
    retryAfter: "20",
  };
}

export async function upstreamFetch(
  path: string,
  init?: { method?: "GET" | "POST"; body?: string; revalidate?: number },
): Promise<UpstreamResult> {
  const method = init?.method ?? "GET";
  try {
    const resp = await fetch(`${upstreamBase()}${path}`, {
      method,
      headers: {
        "X-API-Key": process.env.FIQ_API_KEY ?? "",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body,
      signal: AbortSignal.timeout(method === "GET" ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS),
      // Static pages pass `revalidate` so they render once and refresh in the
      // background; the proxy route (live data for the browser) never caches.
      ...(init?.revalidate ? { next: { revalidate: init.revalidate } } : { cache: "no-store" as const }),
    });
    const body = await resp.text();
    // 5xx from a sleeping/broken upstream → try the snapshot instead.
    if (resp.status >= 500 && method === "GET") {
      const snap = await readSnapshot(path);
      if (snap !== null) return { status: 200, body: snap, source: "snapshot" };
    }
    return {
      status: resp.status,
      body,
      source: "live",
      retryAfter: resp.headers.get("retry-after") ?? undefined,
    };
  } catch {
    if (method === "GET") {
      const snap = await readSnapshot(path);
      if (snap !== null) return { status: 200, body: snap, source: "snapshot" };
    }
    return unavailable(
      "The live API did not answer in time. The free-tier backend sleeps when " +
        "idle and takes up to a minute to wake.",
    );
  }
}

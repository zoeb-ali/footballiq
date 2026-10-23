/**
 * BFF proxy (frontend blueprint §7): the browser never sees the API key.
 * Allow-lists upstream paths AND query parameters, injects auth server-side,
 * caps request bodies, rate-limits writes per visitor, and labels every
 * response with x-fiq-source: live | snapshot.
 */

import { NextRequest, NextResponse } from "next/server";
import { upstreamFetch } from "@/lib/api/server";

export const dynamic = "force-dynamic";

const ALLOWED_GET = [
  /^\/v1\/teams(\/\d+)?$/,
  /^\/v1\/players(\/\d+)?$/,
  /^\/v1\/players\/\d+\/valuation(\/explanation)?$/,
  /^\/v1\/matches(\/\d+)?$/,
  /^\/v1\/valuations$/,
  /^\/v1\/graph\/(talent-flow|clubs)$/,
  /^\/v1\/graph\/nations\/\d+\/supply-concentration$/,
  /^\/v1\/models\/performance$/,
  /^\/health$/,
  /^\/ready$/,
];

const ALLOWED_POST = [/^\/v1\/analyst\/ask$/, /^\/v1\/simulations\/match$/];

// Only parameters the API actually reads; values must be short and simple.
const ALLOWED_PARAMS = new Set(["limit", "offset", "status", "team_id", "position", "sort", "order", "top"]);
const PARAM_VALUE = /^[A-Za-z0-9_-]{1,32}$/;

const MAX_BODY_BYTES = 2_048;

// Per-visitor write budget. In-memory, so it is per serverless instance — a
// speed bump against scripted abuse, with the API's own one-at-a-time analyst
// guard as the hard backstop.
const WINDOW_MS = 60_000;
const LIMITS: Record<string, number> = { analyst: 6, simulations: 30 };
const hits = new Map<string, number[]>();

function problem(status: number, title: string, detail: string, headers?: HeadersInit) {
  return NextResponse.json(
    { type: "about:blank", title, status, detail },
    { status, headers },
  );
}

function canonicalQuery(search: URLSearchParams): string | null {
  const kept: [string, string][] = [];
  for (const [k, v] of search) {
    if (!ALLOWED_PARAMS.has(k) || !PARAM_VALUE.test(v)) return null;
    kept.push([k, v]);
  }
  if (!kept.length) return "";
  return "?" + kept.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}

function rateLimited(request: NextRequest, bucket: string): number | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= (LIMITS[bucket] ?? 10)) {
    hits.set(key, recent);
    return Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5_000) hits.clear(); // bound memory on a long-lived instance
  return null;
}

function toResponse(result: { status: number; body: string; source: string; retryAfter?: string }) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-fiq-source": result.source,
  };
  if (result.retryAfter) headers["Retry-After"] = result.retryAfter;
  return new NextResponse(result.body, { status: result.status, headers });
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path: segments } = await ctx.params;
  const pathname = `/${segments.join("/")}`;
  if (!ALLOWED_GET.some((re) => re.test(pathname))) {
    return problem(404, "Not found", "unknown path");
  }
  const query = canonicalQuery(request.nextUrl.searchParams);
  if (query === null) return problem(400, "Bad request", "unsupported query parameter");
  return toResponse(await upstreamFetch(`${pathname}${query}`));
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path: segments } = await ctx.params;
  const pathname = `/${segments.join("/")}`;
  if (!ALLOWED_POST.some((re) => re.test(pathname))) {
    return problem(404, "Not found", "unknown path");
  }
  const body = await request.text();
  if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
    return problem(413, "Payload too large", "request body exceeds 2 KB");
  }
  const bucket = pathname.includes("/analyst/") ? "analyst" : "simulations";
  const wait = rateLimited(request, bucket);
  if (wait !== null) {
    return problem(429, "Slow down", `Too many requests; try again in ${wait}s.`, {
      "Retry-After": String(wait),
    });
  }
  return toResponse(await upstreamFetch(pathname, { method: "POST", body }));
}

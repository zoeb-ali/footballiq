/**
 * Snapshot store: REAL API responses captured by scripts/capture-snapshots.mjs
 * into one gzipped bundle. Used only as a labelled fallback when the live
 * backend is unreachable — never silently, and never for health/readiness
 * (a saved "alive" would make the status light lie).
 */

import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { snapshotKey } from "./snapshot-key.mjs";

export { snapshotKey };

const NEVER_SNAPSHOT = /^\/(health|ready)(\?|$)/;

let bundle: Promise<Map<string, string>> | null = null;

function load(): Promise<Map<string, string>> {
  bundle ??= readFile(path.join(process.cwd(), "snapshots", "bundle.json.gz"))
    .then((buf) => {
      const parsed = JSON.parse(gunzipSync(buf).toString("utf8")) as { entries: Record<string, string> };
      return new Map(Object.entries(parsed.entries));
    })
    .catch(() => new Map<string, string>());
  return bundle;
}

export async function readSnapshot(apiPath: string): Promise<string | null> {
  if (NEVER_SNAPSHOT.test(apiPath)) return null;
  return (await load()).get(snapshotKey(apiPath)) ?? null;
}

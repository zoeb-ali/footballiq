/**
 * Canonical snapshot key, shared by the capture script and the runtime reader
 * so the two can never disagree again (they did: the app asked for
 * `/v1/teams?limit=100&offset=0` while the file on disk was `v1_teams_limit_100`).
 *
 * Canonical form: path + query params sorted by name, `offset=0` dropped
 * (it is the default), empty params dropped.
 */

/** @param {string} apiPath e.g. "/v1/teams?offset=0&limit=100" */
export function snapshotKey(apiPath) {
  const [pathname, query = ""] = apiPath.split("?", 2);
  const params = new URLSearchParams(query);
  const kept = [...params.entries()]
    .filter(([k, v]) => v !== "" && !(k === "offset" && v === "0"))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const canonical = kept.length
    ? `${pathname}?${kept.map(([k, v]) => `${k}=${v}`).join("&")}`
    : pathname;
  return canonical.replace(/^\//, "").replace(/[^a-zA-Z0-9]+/g, "_") + ".json";
}

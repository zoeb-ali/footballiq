/**
 * Public base URL for metadata, sitemap and robots.
 *
 * Vercel's own production URL wins over NEXT_PUBLIC_SITE_URL: the env var was
 * once set to footballiq.vercel.app, an unrelated app, and sent every crawler
 * and link preview there. Set NEXT_PUBLIC_SITE_URL only for a custom domain.
 */
export function siteUrl(): string {
  const custom = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (custom && vercel && !custom.includes(vercel) && custom.includes(".vercel.app")) {
    return `https://${vercel}`;
  }
  if (custom) return custom.replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const SITE = {
  name: "FootballIQ",
  author: "Zoeb Ali Khan",
  authorUrl: "https://zoeb-ali.github.io",
  repo: "https://github.com/zoeb-ali/footballiq",
  description:
    "Every match of the 2026 World Cup, with a valuation model, a match simulator and an " +
    "analyst whose numbers you can check against the data.",
};

import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Everything the site loads is first-party: self-hosted font and flags, no
// third-party scripts. Next injects inline bootstrap scripts, hence
// 'unsafe-inline' for scripts; dev additionally needs 'unsafe-eval'.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Ship the captured API snapshots with every server route that can fall
  // back to them (blueprint §11), so the labelled fallback works on Vercel.
  outputFileTracingIncludes: {
    "/api/proxy/[...path]": ["./snapshots/bundle.json.gz"],
    "/": ["./snapshots/bundle.json.gz"],
    "/app/players/[id]": ["./snapshots/bundle.json.gz"],
    "/app/players/[id]/explanation": ["./snapshots/bundle.json.gz"],
    "/app/teams/[id]": ["./snapshots/bundle.json.gz"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

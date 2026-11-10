import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webRoot = path.dirname(fileURLToPath(import.meta.url));
// Shared settings (R2 media storage keys) live in the repository root .env, but Next only reads apps/web.
// Load the root first, then apps/web again (forced, because Next caches what it loaded): apps/web wins on any clash
// and Next's own NEXT_PUBLIC_* handling stays based on apps/web.
const devMode = process.env.NODE_ENV !== "production";
const rootEnv = { ...loadEnvConfig(repositoryRoot, devMode, undefined, true).combinedEnv };
loadEnvConfig(webRoot, devMode, undefined, true);
for (const [key, value] of Object.entries(rootEnv)) {
  if (process.env[key] === undefined && value !== undefined) process.env[key] = value;
}
const nextConfig: NextConfig = {
  // Parallel builds (several people or agents working at once) each use their own output folder: NEXT_DIST_DIR=.next-name
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    agentUpgrade: "security",
  },
  // Same variable the server uses; the browser needs it to build media links.
  env: { NEXT_PUBLIC_R2_PUBLIC_URL: process.env.R2_PUBLIC_URL ?? process.env.R2_PUBLIC_BASE_URL ?? "" },
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingRoot: repositoryRoot,
  async headers() {
    // Where the app is allowed to load things from. Sent as "report only" first: the browser logs anything it would
    // have blocked without breaking the page. Switch the header name to Content-Security-Policy once the console is quiet.
    const r2 = process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "";
    const policy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://accounts.google.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "font-src 'self' data:",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com ${r2}`.trim(),
      "frame-src https://accounts.google.com https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy-Report-Only", value: policy },
        ],
      },
    ];
  },
  async redirects() {
    const legacyTabs: Array<[string, string]> = [
      ["room", "/room"],
      ["create", "/create"],
      ["anonymous", "/anonymous"],
      ["marketplace", "/marketplace"],
      ["profile", "/me"],
    ];
    return [
      // Old single-page navigation used /?tab=<name>; every section is a route now.
      ...legacyTabs.map(([tab, destination]) => ({
        source: "/",
        has: [{ type: "query" as const, key: "tab", value: tab }],
        destination,
        permanent: false,
      })),
      // Visitors land on Anonymous: it is the shareable, no-login surface.
      { source: "/", destination: "/anonymous", permanent: false },
      { source: "/games/:path*", destination: "/anonymous", permanent: false },
      { source: "/games-preview", destination: "/anonymous", permanent: false },
      { source: "/meet/:path*", destination: "/anonymous", permanent: false },
      { source: "/connect/:path*", destination: "/anonymous", permanent: false },
      { source: "/dating/:path*", destination: "/anonymous", permanent: false },
    ];
  },
  turbopack: {
    root: repositoryRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

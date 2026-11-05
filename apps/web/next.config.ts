import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingRoot: repositoryRoot,
  async redirects() {
    return [
      { source: "/games/:path*", destination: "/?tab=home", permanent: false },
      { source: "/games-preview", destination: "/?tab=home", permanent: false },
      { source: "/meet/:path*", destination: "/?tab=home", permanent: false },
      { source: "/connect/:path*", destination: "/?tab=home", permanent: false },
      { source: "/dating/:path*", destination: "/?tab=home", permanent: false },
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

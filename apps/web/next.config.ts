import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const monorepoRoot = fileURLToPath(new URL("../..", import.meta.url));
const isDev = process.env.NODE_ENV !== "production";

/**
 * Production serves web and API on one domain: Traefik (or Caddy in docker-compose.full.yml)
 * routes `/api/*` to the API container. In development Next.js imitates that with a rewrite,
 * so the browser always calls relative `/api/...` URLs.
 */
const apiProxyUrl = process.env.API_PROXY_URL ?? (isDev ? "http://localhost:4000" : undefined);

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  turbopack: { root: monorepoRoot },
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: { globalNotFound: true },
  async rewrites() {
    return apiProxyUrl ? [{ source: "/api/:path*", destination: `${apiProxyUrl}/api/:path*` }] : [];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);

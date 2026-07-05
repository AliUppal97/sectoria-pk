import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const monorepoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

/**
 * Local dev/build reads secrets (DATABASE_URL, verification creds) from the
 * monorepo-root `.env` so there is a single source of truth rather than a
 * duplicated copy per app. Next only auto-loads env files from the app root, so
 * we explicitly load the root file here (Node 22's built-in loader). Wrapped in
 * try/catch because the file is absent in CI/production, where the platform
 * injects env vars directly.
 */
try {
  process.loadEnvFile(path.join(process.cwd(), "..", "..", ".env"));
} catch {
  // No root .env (CI/prod) — env comes from the platform.
}

const isProduction = process.env.NODE_ENV === "production";

/** Storage/CDN origin for CSP when set; falls back to the local mock host. */
function storageCspOrigin(): string {
  const base = process.env.STORAGE_PUBLIC_BASE_URL?.trim();
  if (!base) return "http://127.0.0.1:3099";
  try {
    return new URL(base).origin;
  } catch {
    return "";
  }
}

const storageOrigin = storageCspOrigin();

/**
 * Baseline security headers (build-prompt Section 7). A strict, nonce-based CSP
 * for first-party scripts is deferred to the dedicated security-hardening pass
 * (implementation order step 13); until then we ship a conservative policy that
 * still blocks framing, mixed content, and cross-origin leakage. Dev relaxes
 * `script-src`/`style-src` because React Refresh and Turbopack require it.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  isProduction
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:" +
    (storageOrigin ? ` ${storageOrigin}` : ""),
  "font-src 'self' data:",
  "connect-src 'self' ws: https:" +
    (storageOrigin ? ` ${storageOrigin}` : ""),
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://my.matterport.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
]
  .join("; ")
  .concat(isProduction ? "; upgrade-insecure-requests" : "");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Required for `forbidden()` / `unauthorized()` and matching `forbidden.tsx` UI
  // in authenticated portal route groups (see nextjs.org/docs/app/api-reference/config/next-config-js/authInterrupts).
  experimental: {
    authInterrupts: true,
  },
  // Workspace packages are published as raw TS source (their `exports` map to
  // `src/index.ts`) and use NodeNext-style `.js` import specifiers. Listing them
  // here routes them through Next's loader so Turbopack transpiles the source and
  // rewrites `.js` -> `.ts` on resolution. Includes the full transitive set the
  // marketplace pulls in via @sectoria/api-client.
  transpilePackages: [
    "@sectoria/ui",
    "@sectoria/api-client",
    "@sectoria/database",
    "@sectoria/verification",
    "@sectoria/types",
    "@sectoria/storage",
    "@sectoria/domain-escrow",
    "@sectoria/domain-ledger",
    "@sectoria/domain-tax",
    "@sectoria/domain-allocation",
    "@sectoria/domain-balloting",
    "@sectoria/domain-trust-score",
    "@sectoria/domain-land",
  ],
  // Every workspace package is consumed as raw TS source and follows the repo's
  // ESM convention of writing explicit `.js` import specifiers that actually
  // resolve to `.ts`/`.tsx` files. A bundler must rewrite those extensions.
  // Webpack does this via `extensionAlias`; Turbopack has no equivalent and
  // cannot map `.js` -> `.ts` (vercel/next.js#69426), so this app builds with
  // webpack (see the `--webpack` flags in package.json scripts). `turbopack.root`
  // is still set so any incidental Turbopack tooling picks the right workspace.
  turbopack: {
    root: monorepoRoot,
  },
  webpack(config) {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    return config;
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

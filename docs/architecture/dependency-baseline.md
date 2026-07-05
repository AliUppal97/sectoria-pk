# Dependency Baseline

This is the single source of truth for pinned dependency versions across
the Sectoria.pk monorepo. `dependency-management.mdc` requires
checking this file before any install. Update it in the same PR whenever
a new shared dependency is introduced or an existing one is deliberately upgraded.

**Last verified:** June 2026 — re-verify the high-churn packages below
against npm before relying on this table if significant time has passed.

## Core

| Package | Version | Notes |
|---|---|---|
| `next` | `^16.2.0` | Turbopack is default. Async `params`/`searchParams`. |
| `react` / `react-dom` | `^19.0.0` | |
| `typescript` | `^5.7.0` | `strict: true` everywhere |

## Web app (`apps/web`)

| Package | Version | Notes |
|---|---|---|
| `server-only` | `0.0.1` | Build-time guard that errors if a server-only module (the tRPC server caller, DB-touching query helpers) is imported into a Client Component. Single published version. Direct dep of `apps/web`. |
| `leaflet` | `^1.9.4` | Society location map (OpenStreetMap tiles, no API key). Client-only via `next/dynamic`. |
| `react-leaflet` | `^5.0.0` | React bindings for Leaflet on society profile pages. |
| `@types/leaflet` | `^1.9.21` | Type definitions for Leaflet (dev dep of `apps/web`). |
| `@turf/area` | `^7.3.4` | Approximate kanal from GeoJSON boundary polygons on society profiles. |
| `react-markdown` | `^10.1.0` | Server-side blog article markdown rendering (M8). |
| `remark-gfm` | `^4.0.1` | GitHub-flavoured markdown for blog articles. |
| `rehype-sanitize` | `^6.0.0` | HTML sanitization after markdown → HTML conversion (M8). |

## API & validation

| Package | Version | Notes |
|---|---|---|
| `@trpc/server` / `@trpc/client` / `@trpc/react-query` | `^11.0.0` | High churn — verify before installing |
| `@tanstack/react-query` | `^5.60.0` | tRPC's bundled bindings |
| `zod` | `^3.24.0` | Shared via workspace catalog |

## Database

| Package | Version | Notes |
|---|---|---|
| `prisma` / `@prisma/client` | `^6.0.0` | Check generated SQL on every migration before committing. Stay on the pinned v6 major (resolves to latest 6.x) — do not drift to v7 without a deliberate upgrade + ADR. |
| `tsx` | `^4.22.4` | TypeScript runner used to execute `packages/database/prisma/seed.ts` (`prisma db seed`). Dev-only. |

## Auth

| Package | Version | Notes |
|---|---|---|
| `next-auth` | `5.0.0-beta.31` | This is Auth.js v5 — still published under the `next-auth` npm name. `beta.31` is the first beta whose `next` peer range includes `^16.0.0` (earlier betas, incl. `beta.25`, cap at `^15`). High churn — verify exact current tag before installing. |
| `@auth/prisma-adapter` | `^2.7.0` | NOT `@next-auth/prisma-adapter` (deprecated v4 package) |

## Styling

| Package | Version | Notes |
|---|---|---|
| `tailwindcss` | `^4.0.0` | CSS-first `@theme` config, no JS preset file. High churn — verify before installing. |
| `@tailwindcss/postcss` | `^4.0.0` | |
| `@tailwindcss/vite` | `^4.3.1` | Tailwind v4 Vite plugin — used by the `packages/ui` Storybook (Vite) build to compile `theme.css`. |

## UI component toolkit (`packages/ui`)

| Package | Version | Notes |
|---|---|---|
| `class-variance-authority` | `^0.7.1` | Variant-driven className composition for component APIs (Button, Badge). |
| `clsx` | `^2.1.1` | className concatenation, composed into the `cn()` helper. |
| `tailwind-merge` | `^3.6.0` | De-duplicates conflicting Tailwind classes inside `cn()`. |
| `lucide-react` | `^1.22.0` | Icon set. Icons inherit `currentColor` (no hardcoded hex). React 19 compatible. |
| `@radix-ui/react-dialog` | `^1.1.17` | Accessible Dialog primitive — focus trap + `aria-modal`, required by design spec §9. |
| `@radix-ui/react-select` | `^2.3.1` | Accessible Select primitive. |
| `@radix-ui/react-slot` | `^1.3.0` | `asChild` composition for Button. |

## Storybook + Vite (`packages/ui`)

| Package | Version | Notes |
|---|---|---|
| `storybook` / `@storybook/react-vite` | `^10.4.6` | Component workshop + docs. High churn — verify before installing. |
| `@storybook/addon-a11y` | `^10.4.6` | Per-story accessibility checks (WCAG AA is a hard requirement, design spec §9). |
| `@storybook/addon-docs` | `^10.4.6` | Autodocs for component stories. |
| `vite` | `^8.1.0` | Bundler for Storybook. |
| `@vitejs/plugin-react` | `^6.0.3` | React Fast Refresh for the Storybook Vite builder. |
| `@types/react` / `@types/react-dom` | `^19.2.17` / `^19.2.3` | React 19 type definitions. Pin one major workspace-wide to avoid duplicate-types errors. |

## State & jobs

| Package | Version | Notes |
|---|---|---|
| `zustand` | `^5.0.0` | |
| `bullmq` | `^5.30.0` | |
| `ioredis` | `^5.4.0` | |
| `@upstash/ratelimit` | `^2.0.8` | Rate limiting for auth, booking, verification endpoints (`apps/web`). |
| `@upstash/redis` | `^1.38.0` | Upstash Redis REST client for `@upstash/ratelimit`. |

## Object storage (`packages/storage`)

| Package | Version | Notes |
|---|---|---|
| `@aws-sdk/client-s3` | `^3.1079.0` | S3-compatible uploads/downloads (R2, AWS, MinIO) |
| `@aws-sdk/s3-request-presigner` | `^3.1079.0` | Presigned PUT/GET URLs |

## Tooling

| Package | Version | Notes |
|---|---|---|
| `turbo` | `^2.3.0` | |
| `eslint` | `^9.15.0` | Flat config |
| `vitest` | `^2.1.0` | |
| `@playwright/test` | `^1.49.0` | |

## ESLint toolchain (`packages/config`)

| Package | Version | Notes |
|---|---|---|
| `@eslint/js` | `^9.15.0` | ESLint flat config base presets — align major with `eslint` |
| `typescript-eslint` | `^8.62.0` | TypeScript rules for flat config |
| `eslint-config-next` | `^16.2.0` | Align major with `next` |
| `globals` | `^17.7.0` | Shared global identifiers for ESLint |
| `@types/node` | `^22.0.0` | Node.js types for TS packages |

## How to verify a version before installing

```bash
npm view <package> versions --json | tail -20
npm view <package> dist-tags
```

Or check the package's npm page directly. Update the table above in the
same PR as the install.

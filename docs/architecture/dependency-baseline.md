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

## API & validation

| Package | Version | Notes |
|---|---|---|
| `@trpc/server` / `@trpc/client` / `@trpc/react-query` | `^11.0.0` | High churn — verify before installing |
| `@tanstack/react-query` | `^5.60.0` | tRPC's bundled bindings |
| `zod` | `^3.24.0` | Shared via workspace catalog |

## Database

| Package | Version | Notes |
|---|---|---|
| `prisma` / `@prisma/client` | `^6.0.0` | Check generated SQL on every migration before committing |

## Auth

| Package | Version | Notes |
|---|---|---|
| `next-auth` | `5.0.0-beta.25` | This is Auth.js v5 — still published under the `next-auth` npm name. High churn — verify exact current tag before installing. |
| `@auth/prisma-adapter` | `^2.7.0` | NOT `@next-auth/prisma-adapter` (deprecated v4 package) |

## Styling

| Package | Version | Notes |
|---|---|---|
| `tailwindcss` | `^4.0.0` | CSS-first `@theme` config, no JS preset file. High churn — verify before installing. |
| `@tailwindcss/postcss` | `^4.0.0` | |

## State & jobs

| Package | Version | Notes |
|---|---|---|
| `zustand` | `^5.0.0` | |
| `bullmq` | `^5.30.0` | |
| `ioredis` | `^5.4.0` | |

## Tooling

| Package | Version | Notes |
|---|---|---|
| `turbo` | `^2.3.0` | |
| `eslint` | `^9.15.0` | Flat config |
| `vitest` | `^2.1.0` | |
| `@playwright/test` | `^1.49.0` | |

## How to verify a version before installing

```bash
npm view <package> versions --json | tail -20
npm view <package> dist-tags
```

Or check the package's npm page directly. Update the table above in the
same PR as the install.

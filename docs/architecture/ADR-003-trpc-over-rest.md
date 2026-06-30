# ADR-003: tRPC for the internal API layer (not hand-rolled REST)

- **Status:** Accepted (backfilled 2026-06-30)
- **Date:** 2026-06-28
- **Related:** `packages/api-client`, `api-trpc.mdc`, `packages/types`

> **Note:** This ADR documents a decision made during the initial build. It is
> backfilled here per `documentation.mdc` — the codebase already reflects it.

## Context

The web app needs a typed API between React Server Components, client
components, and the composition layer that calls domain logic and Prisma. Options
considered:

1. **Hand-rolled REST** — OpenAPI-first, manual client types, duplicate Zod
   schemas at every boundary.
2. **tRPC v11** — Procedures defined once; input/output types inferred from
   shared Zod schemas in `@sectoria/types`; React Query integration built in.
3. **GraphQL** — Flexible reads, but heavier operational and caching complexity
   for a team-sized monolith.

The master architecture goal is **one schema change propagates everywhere with
compile errors at stale call sites** — duplicated DTO types defeat that.

## Decision

Use **tRPC v11** as the primary internal API:

- Routers live in `packages/api-client/src/routers/*`, merged into `appRouter`.
- Every procedure validates input with Zod schemas from `@sectoria/types`.
- `apps/web` mounts the router at `/api/trpc` and derives the client type from
  `AppRouter` — no manual duplication.
- An OpenAPI shim (`docs/api/`) may be generated later for *external* consumers;
  first-party apps use tRPC only.

REST route handlers are reserved for **non-tRPC boundaries**: Auth.js
(`/api/auth`), webhooks (`/api/webhooks/*`), and SEO/static assets — not for
CRUD that duplicates procedure logic.

## Consequences

- **Positive:** End-to-end type safety from form → procedure → domain → DB;
  refactors fail at compile time instead of in production.
- **Positive:** Shared procedure builders (`verifiedBuyerProcedure`,
  `societyAdminProcedure`, …) encode auth once.
- **Negative / trade-off:** tRPC is not ideal for public third-party API
  consumers without an OpenAPI adapter — acceptable for launch; revisit if a
  partner API is required.
- **Negative / trade-off:** Server Components and tests use `createCallerFactory`
  instead of HTTP — slightly different mental model from REST fetch calls.

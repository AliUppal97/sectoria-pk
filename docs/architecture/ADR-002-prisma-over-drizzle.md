# ADR-002: Prisma over Drizzle for the persistence layer

- **Status:** Accepted (backfilled 2026-06-30)
- **Date:** 2026-06-28
- **Related:** `packages/database`, `database.mdc`, Session 3 schema work

> **Note:** This ADR documents a decision made during the initial build. It is
> backfilled here per `documentation.mdc` — the codebase already reflects it.

## Context

The platform needs a type-safe PostgreSQL layer with migrations, enum support,
relation modeling, and a solo/small-team friendly workflow. Two leading options
in the TypeScript ecosystem are **Prisma** and **Drizzle**.

Drizzle offers lighter runtime weight and strong edge-runtime ergonomics.
Prisma offers Prisma Studio, mature migration tooling, generated client
ergonomics, and extensive documentation — at the cost of a heavier client and
less flexibility for hand-written SQL.

Sectoria is **not** edge-deployed: the app runs as a Node.js server with
PostgreSQL, BullMQ workers, and long-lived connections. Correctness of money,
escrow, and audit trails matters more than shaving milliseconds off cold starts.

## Decision

Use **Prisma ORM** (`packages/database`) as the sole persistence access layer.

- Schema and migrations live in `packages/database/prisma/`.
- Generated types are re-exported from `@sectoria/database` — the rest of the
  monorepo does not import `@prisma/client` directly.
- Money fields use Prisma `Decimal`; whole-rupee amounts in domain logic use
  integer `PkrAmount` at boundaries.

## Consequences

- **Positive:** Faster onboarding and safer schema iteration (Studio, migrate
  diff review, enum parity with `packages/types`).
- **Positive:** Append-only ledger enforcement via raw SQL in migrations
  (Postgres trigger — see ADR-004) integrates cleanly with Prisma migrate.
- **Negative / trade-off:** Heavier client bundle and less SQL-in-TS control
  than Drizzle; complex reporting queries may need `$queryRaw` with extra care.
- **Revisit when:** The app moves significant read paths to edge runtime, or
  query performance profiling shows Prisma as the dominant bottleneck — then
  re-evaluate Drizzle or read-replica-specific access patterns.

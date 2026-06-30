# ADR-001: Modular monolith — one deployable app, many packages

- **Status:** Accepted (backfilled 2026-06-30)
- **Date:** 2026-06-28
- **Related:** `architecture.mdc`, `packages/domain/*`, `packages/api-client`, `apps/web`

> **Note:** This ADR documents a decision made during the initial build. It is
> backfilled here per `documentation.mdc` — the codebase already reflects it.

## Context

Sectoria.pk is a multi-portal product (public marketplace, buyer dashboard,
society admin, dealer portal, platform admin) with heavy domain logic (tax,
escrow, allocation, balloting, trust scoring, audit ledger) and four government
integrations (NADRA, FBR, DNFBP, PLRA). A small team needs to ship quickly
without sacrificing correctness, testability, or a credible path to scale.

Microservices would multiply deployment, observability, and transactional
complexity before the product has production traffic. A single unstructured
Next.js app would entangle UI, persistence, and tax law in ways that make
compliance changes risky and reuse impossible.

## Decision

Adopt a **modular monolith**:

- **One deployable** Next.js app (`apps/web`) organized by route groups per portal
  and auth context.
- **All business logic** extracted into framework-agnostic packages under
  `packages/domain/*`, `packages/verification`, and `packages/types`.
- **One composition layer** (`packages/api-client`) — the only place allowed to
  import both domain and database in the same file.
- **Persistence** isolated in `packages/database` (Prisma schema, client,
  field-level encryption).

The public API surface for frontends is tRPC procedures in `packages/api-client`,
not direct imports of domain or Prisma from pages.

## Consequences

- **Positive:** Domain packages are pure, fully unit-testable, and reusable
  across future clients (mobile, admin tools) without rewriting tax/escrow math.
- **Positive:** Clear dependency direction — UI → api-client → domain/database;
  domain never imports Next.js or Prisma.
- **Positive:** A documented migration path: if a package becomes a bottleneck,
  it can be extracted behind the same interface without a big-bang rewrite.
- **Negative / trade-off:** All portals share one deployment unit — a bad deploy
  affects every surface. Mitigated by CI gates and feature flags where needed.
- **Negative / trade-off:** Engineers must respect package boundaries in code
  review; the compiler does not enforce “pages don’t import Prisma” without lint
  rules and discipline.

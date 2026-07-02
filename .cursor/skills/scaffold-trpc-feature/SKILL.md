---
name: scaffold-trpc-feature
description: Scaffold a new tRPC feature as a vertical slice — Zod types in packages/types, a single-area router in packages/api-client with DTO mappers and the correct procedure guard, ownership checks, tests, and root-router wiring. Use when adding a new API area/router, a new mutation, or implementing a Society Profile V2 session (S0-S2).
disable-model-invocation: true
---

# Scaffold a tRPC Feature (Vertical Slice)

Build one API area end-to-end the way the codebase already does it. Canonical
example to mirror: `packages/api-client/src/routers/society-update.router.ts`.
Honors `api-trpc.mdc`, `middleware-and-guards.mdc`, `auth-and-access-control.mdc`,
`concierge-model.mdc`, and `code-modularity-and-structure.mdc`.

## When to use

- Adding a new domain area router or a new procedure to an existing one.
- Implementing the onboarding/profile routers from
  `docs/architecture/society-profile-v2-spec.md`.

## Order of work (types -> router -> wire -> test)

```
- [ ] 1. Types: Zod schema + `as const` enums in packages/types; export from index.ts barrel
- [ ] 2. Router: one file per area in packages/api-client/src/routers/<area>.router.ts
- [ ] 3. DTO mapper: serialize Date -> ISO string, Decimal -> string (shared helper if reused)
- [ ] 4. Guard: pick the right procedure + resource-ownership assert
- [ ] 5. Wire: register the router in root-router.ts
- [ ] 6. Test: __tests__ covering authz rejection + happy path + invalid input
- [ ] 7. Update docs/architecture/access-rights-matrix.md for each new mutation
```

### 1. Types (single source of truth)

Define the input/entity shape once in `packages/types` and `export *` it from
the barrel. Never inline an ad-hoc Zod shape in the router, and never redefine a
shape that already exists (`api-trpc.mdc`). Mirror Prisma enums exactly with the
`as const` + derived-union pattern (`oop-and-domain-modeling.mdc`).

### 2 & 4. Router + guard

Pick the procedure by caller identity (defined in
`packages/api-client/src/procedures.ts`):

| Caller | Procedure |
|---|---|
| Public/crawlable read | `publicProcedure` (filter `publishStatus = PUBLISHED`) |
| Any authed user (own resource) | `protectedProcedure` + ownership check |
| Society admin | `societyAdminProcedure` + `assertSocietyOwnership` / `resolveOwnedSocietyId` |
| Sectoria ops (create/lifecycle) | `opsProcedure` |
| Dealer (supply-side) | `dealerProcedure` + authorized-category assert |
| Platform curation/super-admin | `superAdminProcedure` |

Rules: re-derive identity from `ctx.session` (never trust input role/userId);
validate before authorization, authorize before work (`middleware-and-guards.mdc`);
throw typed `TRPCError` codes (`NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `BAD_REQUEST`);
wrap multi-write mutations and their `LedgerEvent` in one Prisma `$transaction`;
make money/document mutations idempotent.

**Concierge guard (hard):** never return `dealerNetPkr`, `spreadPkr`,
`commissionSplitPct`, or dealer contact in any buyer-facing payload
(`concierge-model.mdc`).

### 3. DTO mapper

Routers return serializable data. Convert `Date -> .toISOString()` and Prisma
`Decimal -> .toString()` in a small `to<Entity>Dto` mapper (see
`society-update.router.ts` / `society.router.ts`). If two routers share a mapper,
lift it to a `lib/` helper rather than copy-pasting
(`code-modularity-and-structure.mdc`).

### 5. Wire

Add the router to `packages/api-client/src/root-router.ts` under a clear key.
One area per sub-router — never a catch-all file.

### 6. Test

Add `packages/api-client/src/__tests__/<area>.router.test.ts` covering: an
unauthorized/cross-owner call is rejected, the happy path, and invalid input.
For list/read endpoints that could grow, assert pagination and that no
per-row fan-out occurs (`scalability-and-performance.mdc`).

## Verify

`pnpm --filter @sectoria/api-client test`, then `pnpm turbo run test lint typecheck`.
Confirm `access-rights-matrix.md` has a row for every new mutation.

# @sectoria/api-client

**The tRPC composition root.** This is the single layer allowed to import from
*both* `@sectoria/domain-*` and `@sectoria/database` in the same file (see
`api-trpc.mdc`). Routes, pages, and UI never call domain or database packages
directly — everything flows through the procedures defined here, which compose
the **pure** domain functions (tax, allocation, escrow, trust score, ledger)
with persistence and the government-verification adapters.

## What it exposes

- `appRouter` / `AppRouter` — the merged root router and its type. The web app
  mounts the router in its tRPC route handler and imports **only the type** to
  derive a fully-typed client (zero manual duplication).
- `createTRPCContext` + the `TRPCContext` contract — how a host injects the
  database client, verification adapters, session, rate limiter, clock, and id
  generator per request.
- `createCallerFactory` — server-side calls (React Server Components, tests)
  without going over HTTP.
- Named procedure builders and guards for any out-of-tree router.

## Design

- **Everything is injected.** The context carries `db`, `verification`,
  `rateLimiter`, `now`, and `generateId` rather than importing concrete
  singletons inside a procedure. This keeps routers testable without a live
  database or real network and keeps the dependency direction pointing inward.
- **Guards compose; they never duplicate.** `protectedProcedure`,
  `verifiedBuyerProcedure`, `societyAdminProcedure`, `dealerProcedure`, and
  `superAdminProcedure` layer the role/identity guards once. Resource
  *ownership* ("the admin of *this* society", "the buyer of *this* booking") is
  asserted inside the procedure after the resource is loaded — role alone is
  never sufficient for a resource-scoped action (see `auth-and-access-control.mdc`).
- **State change + audit commit together.** Any mutation that emits a
  `LedgerEvent` persists it in the **same** `db.$transaction` as the state change
  it describes, so a booking's escrow state and its audit trail can never diverge.
- **Domain logic is never re-implemented here.** Tax/escrow/allocation/trust
  math is composed from `@sectoria/domain-*`; this layer only fetches inputs,
  calls the pure function, and persists the result.

## Procedure variants

| Variant | Guards |
|---|---|
| `publicProcedure` | none (public marketplace reads) |
| `protectedProcedure` | authenticated |
| `verifiedBuyerProcedure` | `BUYER` **and** NADRA-verified (money-moving actions) |
| `societyAdminProcedure` | `SOCIETY_ADMIN`/`SUPER_ADMIN` (+ ownership assert in-procedure) |
| `dealerProcedure` | `DEALER_PARTNER` |
| `superAdminProcedure` | `SUPER_ADMIN` (cross-tenant reads) |

## Usage

Mounting the router in the Next.js app (`apps/web/app/api/trpc/[trpc]/route.ts`):

```ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@sectoria/api-client";
import { prisma } from "@sectoria/database";
import { createVerificationAdapters } from "@sectoria/verification";
import { auth } from "@/auth";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const authSession = await auth();
      return createTRPCContext({
        db: prisma,
        verification: createVerificationAdapters(),
        session: authSession ? { user: authSession.user } : null,
        clientId: req.headers.get("x-forwarded-for"),
        // rateLimiter: upstashRateLimiter, // wired in apps/web
      });
    },
  });

export { handler as GET, handler as POST };
```

Server-side call without HTTP (e.g. a React Server Component or a test):

```ts
import { appRouter, createTRPCContext, createCallerFactory } from "@sectoria/api-client";

const caller = createCallerFactory(appRouter)(
  createTRPCContext({ db, verification, session }),
);

const societies = await caller.society.list({ citySlug: "lahore" });
```

## Routers

`society`, `inventoryCategory`, `booking`, `dealer`, `verification`, `review`,
`admin` — one router per domain area, merged in `root-router.ts`. The booking
router is the heart of the money flow: `create` (verified buyers),
`allocate`/`advance`/`cancel` (escrow transitions), each composing the domain
state machine and committing the resulting `LedgerEvent` atomically.

## Testing

`vitest run`. The integration tests run the real router → domain → persistence
composition against a small in-memory fake whose `$transaction` has true
rollback semantics — proving the escrow transition and its ledger event commit
atomically (force a ledger-write failure → assert the transition rolled back
with no orphan event) without needing a live Postgres. Guard tests spot-check
that each variant enforces both role and resource ownership.

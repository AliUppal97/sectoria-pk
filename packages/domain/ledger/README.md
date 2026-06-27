# @sectoria/domain-ledger

**Append-only audit event builder.** The single, typed entry point every other
domain package uses to record an auditable state change — escrow transitions,
plot allocations, balloting runs, document issuance, verification results.

## What it does

- `createLedgerEvent(input)` returns a schema-validated `LedgerEvent` with:
  - `id`, `type`, `entityId`, `payload`, `createdAt` (always present)
  - `bookingId`, `actorId`, `actorRole` (present when applicable)
- It validates the assembled event against the shared `ledgerEventSchema` from
  `@sectoria/types`, so a returned event is guaranteed well-formed — a known
  `type`, a non-empty id, an ISO 8601 `createdAt`.

## What it deliberately does NOT do

- **It never writes to a database.** The ledger is INSERT-only; persistence and
  the Postgres trigger that forbids `UPDATE`/`DELETE` live in the database layer
  (see ADR-004). This builder only returns the event for the caller to insert.
- **No I/O, no clock, no RNG, no framework code.** `id` and `createdAt` are
  *injected* by the caller rather than generated here, so the builder is a pure
  function: identical input always produces an identical event. This is what
  makes it deterministic and testable. See `domain-logic.mdc`.
- **No silent failures.** Null/undefined or invalid input throws
  `InvalidLedgerEventError` — never a half-formed record.

## Usage

```ts
import { createLedgerEvent, LedgerEventType } from "@sectoria/domain-ledger";

// A society admin advances an escrow-backed booking.
const event = createLedgerEvent({
  id: "ckz9...event",            // supplied by the persistence layer (e.g. a cuid)
  type: LedgerEventType.ESCROW_TRANSITIONED,
  entityId: "ckz9...booking",
  bookingId: "ckz9...booking",
  payload: { fromState: "ALLOCATED", toState: "INSTALLMENT_DUE" },
  actor: { actorId: "ckz9...user", actorRole: "SOCIETY_ADMIN" },
  createdAt: new Date().toISOString(), // caller's clock, not the domain's
});
// → persist `event` as an INSERT-only ledger row

// A system-initiated event (no human actor):
const verified = createLedgerEvent({
  id: "ckz9...event2",
  type: LedgerEventType.VERIFICATION_COMPLETED,
  entityId: "ckz9...user",
  payload: { provider: "NADRA", outcome: "VERIFIED" },
  actor: {}, // → actorId/actorRole recorded as null
  createdAt: new Date().toISOString(),
});
```

`id` and `createdAt` are injected on purpose: keeping the clock and id source
outside the function is what preserves purity and lets tests assert exact
output. In production the persistence layer provides values consistent with the
database defaults.

## Test

```bash
pnpm --filter @sectoria/domain-ledger test
```

Coverage includes every required field being present, `createdAt` validated as a
real ISO 8601 string, determinism, system vs. human actors, optional
`bookingId`, and typed errors for null/undefined/empty-id/unknown-type/non-ISO
timestamp inputs.

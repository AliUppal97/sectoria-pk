# @sectoria/domain-escrow

The **escrow booking state machine**. Given a booking's current escrow state
and a requested action, it validates the transition and returns the next state
plus an audit event for the caller to persist.

## What it does

- Models the booking/escrow lifecycle as an **explicit, exhaustive
  legal-transition table** (`src/state-machine-definition.ts`) — every legal
  action from every state, and (by omission) every illegal one.
- `transitionEscrowState({ currentState, action, bookingId, occurredAt })`
  returns `{ nextState, event }`, where `event` is a fully-formed
  `EscrowEvent` ready to be written to the audit ledger.
- Exposes pure reads — `getLegalActions(state)` and `canTransition(state,
  action)` — for UIs and guards that need to know what's possible without
  attempting a transition.

## Lifecycle

```
BOOKING_TOKEN_PAID → ALLOCATED → INSTALLMENT_DUE ⇄ INSTALLMENT_PAID
  → FULLY_PAID → DOCUMENTS_ISSUED → COMMISSION_RELEASED
```

`INSTALLMENT_DUE ⇄ INSTALLMENT_PAID` is the per-installment cycle:
`RAISE_INSTALLMENT` moves PAID→DUE for the next installment, `PAY_INSTALLMENT`
moves DUE→PAID. `CANCEL` is legal while the buyer's funds are still held in
escrow — up to and including `FULLY_PAID` — because escrow exists to keep the
payment refundable until the society delivers title. Once `DOCUMENTS_ISSUED`
(title transferred) or `COMMISSION_RELEASED` (funds disbursed) is reached,
reversal is a legal unwind/dispute, not a state transition; both, along with
`CANCELLED`, are terminal.

## What it deliberately does NOT do

- **No I/O, no persistence, no framework code.** It does not write the event,
  read a booking, or touch a database — it takes plain data in and returns
  plain data out. Pure functions only; no imports from Next.js, Prisma, or
  React. Persisting the returned event is the caller's job (see
  `packages/api-client`).
- **No clock.** `occurredAt` is injected by the caller so the function is
  deterministic and testable; it never calls `Date.now()`.

## Usage

```ts
import {
  transitionEscrowState,
  InvalidEscrowTransitionError,
} from "@sectoria/domain-escrow";
import { EscrowState, EscrowAction, idSchema } from "@sectoria/types";

const { nextState, event } = transitionEscrowState({
  currentState: EscrowState.BOOKING_TOKEN_PAID,
  action: EscrowAction.ALLOCATE,
  bookingId: idSchema.parse("booking_123"),
  occurredAt: new Date().toISOString(),
});
// nextState === EscrowState.ALLOCATED
// event === { action, fromState, toState, bookingId, occurredAt }

try {
  transitionEscrowState({
    currentState: EscrowState.CANCELLED,
    action: EscrowAction.ALLOCATE,
    bookingId: idSchema.parse("booking_123"),
    occurredAt: new Date().toISOString(),
  });
} catch (error) {
  if (error instanceof InvalidEscrowTransitionError) {
    // error.fromState === "CANCELLED", error.attemptedAction === "ALLOCATE"
  }
}
```

## Changing the machine

Adding or changing a state means editing the **full transition table** in
`src/state-machine-definition.ts` (enumerate what can and cannot follow the new
state — not just the new edge) and updating the independently-declared expected
table in `src/__tests__/transition-escrow-state.test.ts` in the **same PR**. A
silent table change cannot pass the test suite. See `domain-logic.mdc` and
`testing.mdc`.

## Test

```bash
pnpm --filter @sectoria/domain-escrow test
```

Coverage includes every state's legal and illegal transitions (the full
8×7 matrix), the descriptive typed error on illegal transitions, the full
happy-path lifecycle, the installment cycle, and idempotency of the
state-reading helpers.

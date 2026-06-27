# @sectoria/domain-allocation

**Plot allocation by strategy.** Given a snapshot of an inventory category and a
booking, it decides how that booking gets a plot — immediately, or via a ballot.

## What it does

- `allocatePlot(category, booking)` returns an `AllocationResult` discriminated
  on `outcome`:
  - **`FIFO`** → `outcome: "ASSIGNED"`. The booking immediately claims the
    **lowest available `serialNo`** plot in the category. `serialNo` is treated
    as a stable, sortable key (zero-padded by convention) and compared
    locale-independently, so the chosen plot is reproducible across machines.
  - **`BALLOT`** → `outcome: "PENDING_BALLOT"`. **Nothing is assigned yet.** The
    booking joins the pool as a `ballotEntry` (the exact shape `runBallot`
    consumes) and the deterministic draw in `@sectoria/domain-balloting` decides
    the winner later.
- A category with **zero available plots** throws a typed `NoAvailableUnitsError`
  under either strategy — it never silently returns an empty result.

## What it deliberately does NOT do

- **No I/O, no persistence, no framework code.** It takes plain data in and
  returns plain data out — no imports from Next.js, Prisma, or React.
  Persisting the assignment (or the queued ballot entry) and emitting the
  ledger event is the caller's job (see `packages/api-client` and
  `packages/domain/ledger`).
- **No ballot draw.** The `BALLOT` path only queues the entry; the draw itself
  lives in `@sectoria/domain-balloting`.

## Usage

```ts
import { allocatePlot } from "@sectoria/domain-allocation";
import { AllocationStrategy, idSchema } from "@sectoria/types";

const booking = { bookingId: idSchema.parse("booking_a") };

// FIFO: assigns the lowest available serial immediately.
const fifo = allocatePlot(
  {
    categoryId: idSchema.parse("cat_1"),
    allocationStrategy: AllocationStrategy.FIFO,
    availablePlots: [
      { plotId: idSchema.parse("plot_3"), serialNo: "0003" },
      { plotId: idSchema.parse("plot_1"), serialNo: "0001" },
      { plotId: idSchema.parse("plot_2"), serialNo: "0002" },
    ],
  },
  booking,
);
// fifo.outcome === "ASSIGNED"
// fifo.plot.serialNo === "0001"  → the lowest serial

// BALLOT: queues the booking; no plot assigned yet.
const ballot = allocatePlot(
  {
    categoryId: idSchema.parse("cat_2"),
    allocationStrategy: AllocationStrategy.BALLOT,
    availablePlots: [{ plotId: idSchema.parse("plot_9"), serialNo: "0009" }],
  },
  booking,
);
// ballot.outcome === "PENDING_BALLOT"
// ballot.ballotEntry.bookingId === booking.bookingId  → feed to runBallot later
```

Allocating from a category with no available plots throws a typed
`NoAvailableUnitsError`.

## Test

```bash
pnpm --filter @sectoria/domain-allocation test
```

Coverage includes FIFO assigning the lowest available serial (regardless of
input order), BALLOT returning a pending (non-assigned) result that carries the
booking's ballot entry, and the zero-availability typed error under both
strategies.

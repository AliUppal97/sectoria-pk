# @sectoria/domain-balloting

The **deterministic, seeded plot ballot**. When a `BALLOT`-strategy inventory
category is oversubscribed, confirmed bookings enter a pool and a seeded draw
decides who wins which plot — reproducibly and auditably.

## What it does

- `runBallot(entries, availablePlots, seed)` returns a `BallotResult`
  containing the `seed`, a SHA-256 `inputHash` of the exact set drawn over, the
  winning `assignments`, any `unassignedBookingIds` (when oversubscribed), and a
  human-readable `verificationStatement` suitable for a PDF certificate.
- **Determinism is the fairness guarantee.** The same `entries` and `seed`
  always produce the same result. Randomness comes solely from the seed; entries
  and plots are sorted into a canonical order first, so the outcome never
  depends on the incidental order the arrays arrived in.
- Plots are awarded to the shuffled winners in ascending `serialNo` order.
- Re-exports `hashBallotInputSet` / `sha256Hex` so a third party can recompute
  the fingerprint and independently verify a published draw.

## What it deliberately does NOT do

- **No I/O, no persistence, no framework code.** It takes plain data in and
  returns plain data out — no imports from Next.js, Prisma, or React. Persisting
  the result and emitting the ledger event is the caller's job (see
  `packages/api-client` and `packages/domain/ledger`).
- **No unseeded randomness.** It never calls `Math.random()`; the draw is driven
  entirely by SHA-256 over the injected `seed`, which is what keeps it
  reproducible. See `domain-logic.mdc`.

## Usage

```ts
import { runBallot } from "@sectoria/domain-balloting";
import { idSchema } from "@sectoria/types";

const entries = [
  { bookingId: idSchema.parse("booking_a") },
  { bookingId: idSchema.parse("booking_b") },
  { bookingId: idSchema.parse("booking_c") },
];
const plots = [
  { plotId: idSchema.parse("plot_1"), serialNo: "0001" },
  { plotId: idSchema.parse("plot_2"), serialNo: "0002" },
];

const result = runBallot(entries, plots, "2026-ballot-phase-2-block-c");
// result.assignments      → 2 winners, each holding a distinct plot
// result.unassignedBookingIds → 1 booking (oversubscribed by one)
// result.inputHash        → SHA-256 fingerprint of the exact input set
// result.verificationStatement → PDF-ready summary

// Same entries + same seed → byte-identical result.
const again = runBallot(entries, plots, "2026-ballot-phase-2-block-c");
// JSON.stringify(again) === JSON.stringify(result)
```

An empty entry pool throws a typed `EmptyBallotError`; a repeated `bookingId`
throws `DuplicateBallotEntryError`.

## Test

```bash
pnpm --filter @sectoria/domain-balloting test
```

Coverage includes determinism (calling twice asserts deep equality), the result
carrying the `seed` and a verifiable SHA-256 hash of the inputs, input-order
independence, oversubscribed/undersubscribed rounds, and the empty-entries and
duplicate-entry typed errors.

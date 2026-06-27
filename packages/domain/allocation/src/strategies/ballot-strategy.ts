import {
  AllocationOutcome,
  AllocationStrategy,
  type BallotAllocationResult,
  type BallotEntry,
  type BookingSnapshot,
  type InventoryCategorySnapshot,
} from "@sectoria/types";

/**
 * Allocates under the `BALLOT` strategy by assigning *nothing* yet: the
 * booking joins the ballot pool and the deterministic, seeded draw in
 * `packages/domain/balloting` decides the winner later. This deferral is the
 * whole point of a ballot — when demand exceeds supply, fairness comes from a
 * reproducible draw, not from who clicked first.
 *
 * The returned `ballotEntry` is exactly the shape `runBallot` consumes, so the
 * caller can persist it to the pending pool and feed it back at draw time
 * without reshaping.
 *
 * Pure function: no I/O, no persistence, no framework code. See `domain-logic.mdc`.
 *
 * @param _category - The category snapshot. Unused beyond the upstream
 *   availability guard in {@link allocatePlot}; the ballot's plot supply is
 *   resolved at draw time, not here.
 * @param booking - The booking entering the pool.
 * @returns A {@link BallotAllocationResult} carrying the queued `ballotEntry`.
 */
export function allocateBallot(
  _category: InventoryCategorySnapshot,
  booking: BookingSnapshot,
): BallotAllocationResult {
  const ballotEntry: BallotEntry = {
    bookingId: booking.bookingId,
    ...(booking.buyerId !== undefined ? { buyerId: booking.buyerId } : {}),
  };

  return {
    outcome: AllocationOutcome.PENDING_BALLOT,
    strategy: AllocationStrategy.BALLOT,
    bookingId: booking.bookingId,
    ballotEntry,
  };
}

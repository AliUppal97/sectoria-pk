import {
  AllocationStrategy,
  allocationResultSchema,
  bookingSnapshotSchema,
  inventoryCategorySnapshotSchema,
  type AllocationResult,
  type BookingSnapshot,
  type InventoryCategorySnapshot,
} from "@sectoria/types";
import {
  NoAvailableUnitsError,
  UnknownAllocationStrategyError,
} from "./errors.js";
import { allocateBallot } from "./strategies/ballot-strategy.js";
import { allocateFifo } from "./strategies/fifo-strategy.js";

/**
 * Allocates an available plot from an inventory category to a booking,
 * dispatching on the category's `allocationStrategy`:
 *
 * - `FIFO`: the booking immediately claims the lowest available serial plot
 *   (see {@link allocateFifo}).
 * - `BALLOT`: the booking joins the pending pool and is assigned nothing until
 *   the deterministic draw runs (see {@link allocateBallot} and
 *   `packages/domain/balloting`).
 *
 * A category with zero available plots cannot allocate under either strategy
 * and throws {@link NoAvailableUnitsError} — allocation never silently returns
 * an empty or `null` result. Inputs are validated at the boundary so the
 * allocators only ever operate on well-formed, branded data, and the result is
 * re-validated on the way out so its invariants are guaranteed.
 *
 * Pure function: no I/O, no persistence, no framework code. Persisting the
 * assignment (or the queued ballot entry) and emitting the ledger event is the
 * caller's job. See `domain-logic.mdc`.
 *
 * @param category - A point-in-time snapshot of the category and its available plots.
 * @param booking - The booking claiming a plot.
 * @returns A schema-validated {@link AllocationResult}, discriminated on `outcome`.
 * @throws {NoAvailableUnitsError} if the category has zero available plots.
 * @throws {UnknownAllocationStrategyError} if the strategy has no implementation.
 */
export function allocatePlot(
  category: InventoryCategorySnapshot,
  booking: BookingSnapshot,
): AllocationResult {
  const parsedCategory = inventoryCategorySnapshotSchema.parse(category);
  const parsedBooking = bookingSnapshotSchema.parse(booking);

  if (parsedCategory.availablePlots.length === 0) {
    throw new NoAvailableUnitsError(parsedCategory.categoryId);
  }

  const result = dispatchByStrategy(parsedCategory, parsedBooking);

  // Re-validate the assembled result so its invariants (branded ids, the
  // outcome/strategy pairing) are guaranteed on the way out.
  return allocationResultSchema.parse(result);
}

/** Routes to the strategy implementation, exhaustively over {@link AllocationStrategy}. */
function dispatchByStrategy(
  category: InventoryCategorySnapshot,
  booking: BookingSnapshot,
): AllocationResult {
  switch (category.allocationStrategy) {
    case AllocationStrategy.FIFO:
      return allocateFifo(category, booking);
    case AllocationStrategy.BALLOT:
      return allocateBallot(category, booking);
    default:
      // Unreachable while every enum member is handled above; the
      // `never`-typed value makes a missing case a compile error, and the
      // throw guards against an enum value added without an allocator.
      return assertUnreachableStrategy(category.allocationStrategy);
  }
}

/** Fails loudly on an allocation strategy with no implementation. */
function assertUnreachableStrategy(strategy: never): never {
  throw new UnknownAllocationStrategyError(String(strategy));
}

import {
  AllocationOutcome,
  AllocationStrategy,
  type BookingSnapshot,
  type FifoAllocationResult,
  type InventoryCategorySnapshot,
  type PlotSlot,
} from "@sectoria/types";

/**
 * Allocates the next plot under the `FIFO` strategy: the booking immediately
 * claims the lowest available `serialNo` plot in the category. The caller is
 * responsible for ordering bookings (the "first-in" of first-in-first-out);
 * this function decides only *which* plot a given booking receives, and the
 * answer is deterministic — always the lowest serial currently available.
 *
 * `serialNo` is treated as a stable, sortable key (zero-padded by convention,
 * e.g. `"0001"`), compared by UTF-16 code unit rather than locale collation so
 * the "lowest" plot is the same on every machine — matching how
 * `packages/domain/balloting` awards plots in ascending serial order.
 *
 * Pure function: it computes and returns the assignment but performs no I/O and
 * writes to no database — persisting the result is the caller's job. See
 * `domain-logic.mdc`.
 *
 * @param category - The category snapshot; `availablePlots` must be non-empty.
 *   Emptiness is rejected upstream in {@link allocatePlot}, not here.
 * @param booking - The booking claiming a plot.
 * @returns A {@link FifoAllocationResult} naming the assigned plot.
 */
export function allocateFifo(
  category: InventoryCategorySnapshot,
  booking: BookingSnapshot,
): FifoAllocationResult {
  const lowestSerialPlot = pickLowestSerial(category.availablePlots);

  return {
    outcome: AllocationOutcome.ASSIGNED,
    strategy: AllocationStrategy.FIFO,
    bookingId: booking.bookingId,
    plot: lowestSerialPlot,
  };
}

/**
 * Returns the plot with the lowest `serialNo`. Assumes a non-empty array (the
 * caller guards emptiness); the assertion only satisfies
 * `noUncheckedIndexedAccess`.
 */
function pickLowestSerial(plots: readonly PlotSlot[]): PlotSlot {
  return [...plots].sort((a, b) => compareSerials(a.serialNo, b.serialNo))[0]!;
}

/**
 * Locale-independent ascending comparison by UTF-16 code unit. Deliberately
 * not `localeCompare` — collation rules vary by locale and would make the
 * chosen "lowest" plot non-reproducible across machines.
 */
function compareSerials(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

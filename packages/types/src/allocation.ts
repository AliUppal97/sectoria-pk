import { z } from "zod";
import { idSchema } from "./common.js";
import { allocationStrategySchema, AllocationStrategy } from "./inventory-category.js";
import { ballotEntrySchema, plotSlotSchema } from "./ballot.js";

/**
 * The shared data contracts for allocating a plot to a booking. The
 * allocation algorithm itself lives in `packages/domain/allocation` (logic,
 * not data) — this file only defines the shapes that cross package
 * boundaries and get persisted. Allocation is strategy-driven: a `FIFO`
 * category hands out the next serial plot immediately, while a `BALLOT`
 * category defers to a deterministic seeded draw (see `packages/domain/balloting`).
 */

/**
 * What happened when a booking attempted to claim a plot:
 * - `ASSIGNED`: a plot was handed out immediately (the `FIFO` strategy).
 * - `PENDING_BALLOT`: the booking joined the ballot pool and no plot is
 *   assigned yet; the deterministic draw decides the winner later (the
 *   `BALLOT` strategy).
 */
export const AllocationOutcome = {
  ASSIGNED: "ASSIGNED",
  PENDING_BALLOT: "PENDING_BALLOT",
} as const;
export type AllocationOutcome =
  (typeof AllocationOutcome)[keyof typeof AllocationOutcome];
export const allocationOutcomeSchema = z.nativeEnum(AllocationOutcome);

/**
 * A point-in-time, framework-free view of an inventory category, holding
 * only what the allocator needs: the `allocationStrategy` and the plots
 * currently up for allocation (reusing the {@link plotSlotSchema} contract).
 * It is a *snapshot* the caller assembles from the database — the domain
 * never reads persistence itself. `availablePlots` is the source of truth
 * for availability; an empty array means the category has nothing to hand out.
 */
export const inventoryCategorySnapshotSchema = z.object({
  categoryId: idSchema,
  allocationStrategy: allocationStrategySchema,
  availablePlots: z.array(plotSlotSchema),
});
export type InventoryCategorySnapshot = z.infer<
  typeof inventoryCategorySnapshotSchema
>;

/**
 * The minimal view of the booking claiming a plot. `buyerId` is optional and
 * carried only for the audit/ballot-entry trail; allocation never branches on
 * the buyer's identity.
 */
export const bookingSnapshotSchema = z.object({
  bookingId: idSchema,
  buyerId: idSchema.optional(),
});
export type BookingSnapshot = z.infer<typeof bookingSnapshotSchema>;

/**
 * A `FIFO` allocation that assigned a concrete plot immediately. `plot` is the
 * lowest-serial available plot at the time of allocation.
 */
export const fifoAllocationResultSchema = z.object({
  outcome: z.literal(AllocationOutcome.ASSIGNED),
  strategy: z.literal(AllocationStrategy.FIFO),
  bookingId: idSchema,
  plot: plotSlotSchema,
});
export type FifoAllocationResult = z.infer<typeof fifoAllocationResultSchema>;

/**
 * A `BALLOT` allocation that assigned nothing yet — the booking entered the
 * pool as `ballotEntry` and awaits the deterministic draw in
 * `packages/domain/balloting`.
 */
export const ballotAllocationResultSchema = z.object({
  outcome: z.literal(AllocationOutcome.PENDING_BALLOT),
  strategy: z.literal(AllocationStrategy.BALLOT),
  bookingId: idSchema,
  ballotEntry: ballotEntrySchema,
});
export type BallotAllocationResult = z.infer<
  typeof ballotAllocationResultSchema
>;

/**
 * The outcome of an allocation attempt, discriminated on `outcome` so callers
 * get exhaustive, type-safe handling of the assigned-vs-pending split without
 * inspecting optional fields.
 */
export const allocationResultSchema = z.discriminatedUnion("outcome", [
  fifoAllocationResultSchema,
  ballotAllocationResultSchema,
]);
export type AllocationResult = z.infer<typeof allocationResultSchema>;

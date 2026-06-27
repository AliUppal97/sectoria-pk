import { z } from "zod";
import { idSchema } from "./common.js";

/**
 * The shared data contracts for a balloting round. A ballot is how plots in
 * a `BALLOT`-strategy {@link InventoryCategory} are handed out when demand
 * exceeds supply: confirmed bookings enter a pool and a deterministic,
 * seeded draw decides who wins which plot. The draw logic itself lives in
 * `packages/domain/balloting` (an algorithm is logic, not data) — this file
 * only defines the shapes that cross package boundaries and get persisted.
 */

/**
 * A single participant entered into a ballot draw — one confirmed booking
 * competing for a plot. `bookingId` is the stable identity used to order the
 * pool deterministically before the draw, so the result never depends on the
 * incidental order the entries happened to arrive in.
 */
export const ballotEntrySchema = z.object({
  bookingId: idSchema,
  /** The buyer behind the booking, recorded for the audit/verification trail. */
  buyerId: idSchema.optional(),
});
export type BallotEntry = z.infer<typeof ballotEntrySchema>;

/**
 * A plot slot available to be won in a ballot. `serialNo` is the stable
 * ascending key that decides which physical plot the n-th winner receives,
 * so plot assignment is reproducible and not left to array ordering.
 */
export const plotSlotSchema = z.object({
  plotId: idSchema,
  serialNo: z.string().min(1),
  /** The society's own plot label, if already assigned. */
  plotNo: z.string().min(1).optional(),
});
export type PlotSlot = z.infer<typeof plotSlotSchema>;

/** One winner's plot assignment. `position` is the 1-based rank in the draw. */
export const ballotAssignmentSchema = z.object({
  position: z.number().int().positive(),
  bookingId: idSchema,
  plotId: idSchema,
  serialNo: z.string().min(1),
});
export type BallotAssignment = z.infer<typeof ballotAssignmentSchema>;

/**
 * The complete, auditable outcome of a ballot draw. It carries everything a
 * third party needs to independently reproduce and verify the result: the
 * `seed` that drove the randomness and a SHA-256 `inputHash` fingerprinting
 * the exact entry/plot set that went in. `verificationStatement` is a
 * human-readable summary suitable for embedding in a PDF certificate.
 */
export const ballotResultSchema = z.object({
  seed: z.string().min(1),
  /** Lowercase hex SHA-256 digest of the canonicalised input set. */
  inputHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/, "Must be a lowercase hex SHA-256 digest"),
  assignments: z.array(ballotAssignmentSchema),
  /** Bookings that drew no plot because the round was oversubscribed. */
  unassignedBookingIds: z.array(idSchema),
  totalEntries: z.number().int().nonnegative(),
  totalPlots: z.number().int().nonnegative(),
  verificationStatement: z.string().min(1),
});
export type BallotResult = z.infer<typeof ballotResultSchema>;

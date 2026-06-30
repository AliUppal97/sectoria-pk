import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common.js";
import { userRoleSchema } from "./user.js";

/**
 * The kinds of state changes recorded in the append-only audit ledger.
 * Every domain package that mutates state emits one of these. Kept as a
 * closed set so the ledger viewer and analytics can rely on a fixed
 * vocabulary; add a new member here when a new auditable action appears.
 */
export const LedgerEventType = {
  BOOKING_CREATED: "BOOKING_CREATED",
  ESCROW_TRANSITIONED: "ESCROW_TRANSITIONED",
  PLOT_ALLOCATED: "PLOT_ALLOCATED",
  BALLOT_RUN: "BALLOT_RUN",
  DOCUMENT_ISSUED: "DOCUMENT_ISSUED",
  COMMISSION_RELEASED: "COMMISSION_RELEASED",
  VERIFICATION_COMPLETED: "VERIFICATION_COMPLETED",
  REVIEW_SUBMITTED: "REVIEW_SUBMITTED",
  SOCIETY_VERIFICATION_REVIEWED: "SOCIETY_VERIFICATION_REVIEWED",
  DEALER_VERIFICATION_REVIEWED: "DEALER_VERIFICATION_REVIEWED",
  PLOT_DISPUTE_FLAGGED: "PLOT_DISPUTE_FLAGGED",
  PLOT_DISPUTE_RESOLVED: "PLOT_DISPUTE_RESOLVED",
} as const;
export type LedgerEventType =
  (typeof LedgerEventType)[keyof typeof LedgerEventType];
export const ledgerEventTypeSchema = z.nativeEnum(LedgerEventType);

/**
 * Who performed an audited action. `actorId`/`actorRole` are null for
 * system-initiated events (e.g. a scheduled job) that have no human actor.
 */
export const actorRefSchema = z.object({
  actorId: idSchema.nullable().optional(),
  actorRole: userRoleSchema.nullable().optional(),
});
export type ActorRef = z.infer<typeof actorRefSchema>;

/**
 * An immutable audit record. Persisted INSERT-only — UPDATE/DELETE are
 * forbidden at the database level (see ADR-004). `payload` is an opaque
 * bag of event-specific detail.
 */
export const ledgerEventSchema = z.object({
  id: idSchema,
  type: ledgerEventTypeSchema,
  entityId: idSchema,
  bookingId: idSchema.nullable().optional(),
  payload: z.record(z.unknown()),
  actorId: idSchema.nullable().optional(),
  actorRole: userRoleSchema.nullable().optional(),
  createdAt: isoDateTimeSchema,
});
export type LedgerEvent = z.infer<typeof ledgerEventSchema>;

import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common.js";

/**
 * States of an escrow-backed booking. Mirrors the Prisma `EscrowState`
 * enum. The legal transition table itself lives in `packages/domain/escrow`
 * (a state machine is logic, not data) — this enum is only the vocabulary.
 *
 * Happy path:
 *   BOOKING_TOKEN_PAID → ALLOCATED → INSTALLMENT_DUE ⇄ INSTALLMENT_PAID
 *     → FULLY_PAID → DOCUMENTS_ISSUED → COMMISSION_RELEASED
 */
export const EscrowState = {
  BOOKING_TOKEN_PAID: "BOOKING_TOKEN_PAID",
  ALLOCATED: "ALLOCATED",
  INSTALLMENT_DUE: "INSTALLMENT_DUE",
  INSTALLMENT_PAID: "INSTALLMENT_PAID",
  FULLY_PAID: "FULLY_PAID",
  DOCUMENTS_ISSUED: "DOCUMENTS_ISSUED",
  COMMISSION_RELEASED: "COMMISSION_RELEASED",
  CANCELLED: "CANCELLED",
} as const;
export type EscrowState = (typeof EscrowState)[keyof typeof EscrowState];
export const escrowStateSchema = z.nativeEnum(EscrowState);

/**
 * Actions that drive escrow transitions. The domain layer decides which
 * actions are legal from which state; this enum names the full set of
 * intents a caller can request.
 */
export const EscrowAction = {
  ALLOCATE: "ALLOCATE",
  RAISE_INSTALLMENT: "RAISE_INSTALLMENT",
  PAY_INSTALLMENT: "PAY_INSTALLMENT",
  COMPLETE_PAYMENT: "COMPLETE_PAYMENT",
  ISSUE_DOCUMENTS: "ISSUE_DOCUMENTS",
  RELEASE_COMMISSION: "RELEASE_COMMISSION",
  CANCEL: "CANCEL",
} as const;
export type EscrowAction = (typeof EscrowAction)[keyof typeof EscrowAction];
export const escrowActionSchema = z.nativeEnum(EscrowAction);

/**
 * The record produced by a successful escrow transition. The domain
 * function returns this for the caller to persist to the audit ledger —
 * the domain itself never touches a database.
 */
export const escrowEventSchema = z.object({
  action: escrowActionSchema,
  fromState: escrowStateSchema,
  toState: escrowStateSchema,
  bookingId: idSchema,
  occurredAt: isoDateTimeSchema,
  metadata: z.record(z.unknown()).optional(),
});
export type EscrowEvent = z.infer<typeof escrowEventSchema>;

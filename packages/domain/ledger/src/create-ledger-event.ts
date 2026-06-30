import {
  ledgerEventSchema,
  type ActorRef,
  type Id,
  type IsoDateTime,
  type LedgerEvent,
  type LedgerEventType,
} from "@sectoria/types";
import { InvalidLedgerEventError } from "./errors.js";

/**
 * Everything needed to build one append-only audit record.
 *
 * `id` and `createdAt` are *injected* rather than generated inside the
 * function. The builder is a pure function — it never calls `crypto.randomUUID`
 * or reads `Date.now()` — so the same input always produces the same event,
 * which keeps it deterministic and testable. The caller (the persistence layer
 * in `packages/api-client`/`packages/database`) supplies the id and timestamp,
 * typically from the same source the database uses. See `domain-logic.mdc`.
 */
export interface CreateLedgerEventInput {
  /** Stable identifier for the event row (e.g. a cuid). */
  readonly id: Id;
  /** Which kind of state change this records. */
  readonly type: LedgerEventType;
  /** The primary entity the event is about (booking, plot, dealer, …). */
  readonly entityId: Id;
  /** Event-specific detail. Opaque to the ledger; never used for control flow. */
  readonly payload: Record<string, unknown>;
  /**
   * Who performed the action. Pass `{ actorId: null, actorRole: null }` (or an
   * empty object) for system-initiated events with no human actor.
   */
  readonly actor: ActorRef;
  /** When the event occurred, as an ISO 8601 string (with offset). */
  readonly createdAt: IsoDateTime;
  /** The booking this event belongs to, when applicable. */
  readonly bookingId?: Id | null;
}

/**
 * Builds a typed, append-only {@link LedgerEvent} for the caller to persist.
 *
 * This is the single entry point every domain package uses to record an
 * auditable state change (escrow transition, allocation, balloting, document
 * issuance, …). It assembles the event from the supplied parts and re-validates
 * it against {@link ledgerEventSchema} at the boundary, so the returned object's
 * invariants — a non-empty `id`/`entityId`, a known `type`, an ISO 8601
 * `createdAt` — are guaranteed rather than assumed.
 *
 * It does **not** write to a database. The ledger is INSERT-only and the actual
 * persistence (and the trigger that forbids UPDATE/DELETE) lives in the database
 * layer — see ADR-004 and `domain-logic.mdc`. This function only returns the
 * event for the caller to insert.
 *
 * Pure function: no I/O, no persistence, no framework code, no clock or RNG.
 *
 * @see ADR-004 — append-only audit ledger; compensating events replace edits.
 *
 * @param input - The event's id, type, subject, payload, actor, and timestamp.
 * @returns A schema-validated {@link LedgerEvent}.
 * @throws {InvalidLedgerEventError} if `input` is null/undefined or any field
 *   fails validation (unknown `type`, empty id, non-ISO `createdAt`, …).
 */
export function createLedgerEvent(input: CreateLedgerEventInput): LedgerEvent {
  if (input === null || input === undefined) {
    throw new InvalidLedgerEventError(
      "Ledger event input is required, but received null or undefined.",
    );
  }

  const actor: ActorRef = input.actor ?? {};

  const candidate = {
    id: input.id,
    type: input.type,
    entityId: input.entityId,
    payload: input.payload,
    actorId: actor.actorId ?? null,
    actorRole: actor.actorRole ?? null,
    createdAt: input.createdAt,
    // Only attach bookingId when the event actually relates to a booking, so a
    // standalone event (e.g. a verification result) doesn't carry a null FK.
    ...(input.bookingId != null ? { bookingId: input.bookingId } : {}),
  };

  const result = ledgerEventSchema.safeParse(candidate);
  if (!result.success) {
    throw new InvalidLedgerEventError(
      `Ledger event failed validation: ${result.error.message}`,
    );
  }

  return result.data;
}

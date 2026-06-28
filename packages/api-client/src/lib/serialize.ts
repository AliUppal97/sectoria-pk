import {
  type Booking,
  bookingSchema,
  type LedgerEvent,
  ledgerEventSchema,
} from "@sectoria/types";
import type {
  Booking as BookingRow,
  LedgerEvent as LedgerEventRow,
} from "@sectoria/database";

/**
 * Converts a persisted Prisma {@link BookingRow} into the wire/domain
 * {@link Booking} contract from `@sectoria/types`: `Date`s become ISO strings,
 * the JSON `taxBreakdown` is re-validated, and ids are branded. Re-parsing
 * through `bookingSchema` guarantees the shape leaving the API matches the
 * single source of truth rather than whatever the database happened to hold.
 *
 * @param row - The Prisma booking record.
 * @param allocatedPlotId - The id of the plot assigned to this booking, when
 *   known from the same operation (the relation is modelled on `Plot`, so it
 *   isn't a scalar column on the booking row).
 */
export function toBookingDto(
  row: BookingRow,
  allocatedPlotId?: string | null,
): Booking {
  return bookingSchema.parse({
    id: row.id,
    buyerId: row.buyerId,
    categoryId: row.categoryId,
    paymentPlanId: row.paymentPlanId,
    dealerId: row.dealerId,
    status: row.status,
    taxBreakdown: row.taxBreakdown,
    allocatedPlotId: allocatedPlotId ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}

/**
 * Converts a persisted Prisma {@link LedgerEventRow} into the {@link LedgerEvent}
 * contract — used by booking-detail and admin ledger views. The stored `type`
 * is a free-text column at the database level but re-validated here against the
 * closed `LedgerEventType` vocabulary so a malformed row fails loudly.
 */
export function toLedgerEventDto(row: LedgerEventRow): LedgerEvent {
  return ledgerEventSchema.parse({
    id: row.id,
    type: row.type,
    entityId: row.entityId,
    bookingId: row.bookingId,
    payload: row.payload,
    actorId: row.actorId,
    actorRole: row.actorRole,
    createdAt: row.createdAt.toISOString(),
  });
}

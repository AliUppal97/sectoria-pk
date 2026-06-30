import "server-only";
import type { Booking, PlotType } from "@sectoria/types";
import { getAuthedApi } from "@/lib/trpc/server";

/**
 * A buyer's booking enriched with the society/category display fields the
 * portal lists need but that the lean `booking` DTO doesn't bundle (it carries
 * only ids). Resolved through the authenticated tRPC caller.
 */
export interface BookingView {
  readonly booking: Booking;
  readonly categoryLabel: string | null;
  readonly plotType: PlotType | null;
  readonly societyName: string | null;
  readonly societyHref: string | null;
}

/**
 * Enriches bookings with their society + category labels.
 *
 * SCALE NOTE: one society list + one category fetch per distinct category. Fine
 * for a buyer's handful of bookings; if a buyer ever holds many, replace with a
 * dedicated aggregate procedure rather than widening this fan-out
 * (scalability-and-performance.mdc) — mirrors the marketplace `queries.ts` note.
 */
export async function enrichBookings(
  bookings: readonly Booking[],
): Promise<BookingView[]> {
  if (bookings.length === 0) return [];

  const api = await getAuthedApi();
  const societies = await api.society.list();
  const societyById = new Map(societies.map((society) => [society.id, society]));

  const uniqueCategoryIds = [...new Set(bookings.map((b) => b.categoryId))];
  const categories = await Promise.all(
    uniqueCategoryIds.map((categoryId) =>
      api.inventoryCategory.getById({ categoryId }).catch(() => null),
    ),
  );
  const categoryById = new Map(
    categories.filter((c) => c !== null).map((c) => [c.id, c]),
  );

  return bookings.map((booking) => {
    const category = categoryById.get(booking.categoryId) ?? null;
    const society = category ? societyById.get(category.societyId) : undefined;
    return {
      booking,
      categoryLabel: category
        ? `${category.phase} · ${category.block} · ${category.sizeLabel}`
        : null,
      plotType: category?.plotType ?? null,
      societyName: society?.name ?? null,
      societyHref: society ? `/societies/${society.citySlug}/${society.slug}` : null,
    };
  });
}

/** A short, human-friendly booking reference derived from the booking id. */
export function bookingRef(bookingId: string): string {
  return `SEC-${bookingId.slice(-6).toUpperCase()}`;
}

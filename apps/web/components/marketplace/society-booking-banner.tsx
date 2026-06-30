import { formatDate, StatusBadge } from "@sectoria/ui";
import type { SocietyBookingStatus } from "@sectoria/types";

const BOOKING_STATUS_META: Record<
  SocietyBookingStatus,
  {
    readonly variant: "success" | "warning" | "danger";
    readonly label: string;
    readonly description: (opensAt: string | null, closesAt: string | null) => string;
  }
> = {
  OPEN: {
    variant: "success",
    label: "Booking open",
    description: () =>
      "This society is accepting new bookings through Sectoria's verified escrow flow.",
  },
  CLOSED: {
    variant: "danger",
    label: "Booking closed",
    description: (_opensAt, closesAt) =>
      closesAt !== null
        ? `Booking closed on ${formatDate(closesAt)}. Contact Sectoria for waitlist or resale options.`
        : "Booking is currently closed for this society.",
  },
  UPCOMING: {
    variant: "warning",
    label: "Booking opening soon",
    description: (opensAt) =>
      opensAt !== null
        ? `Booking opens on ${formatDate(opensAt)}. Request a quote now and we will notify you when inventory is released.`
        : "Booking has not opened yet for this society.",
  },
};

export function SocietyBookingBanner({
  status,
  bookingOpensAt,
  bookingClosesAt,
}: {
  status: SocietyBookingStatus;
  bookingOpensAt: string | null;
  bookingClosesAt: string | null;
}) {
  const meta = BOOKING_STATUS_META[status];
  return (
    <div
      className="border-b border-border-base bg-surface-base"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
        <p className="font-sans text-sm text-text-secondary">
          {meta.description(bookingOpensAt, bookingClosesAt)}
        </p>
      </div>
    </div>
  );
}

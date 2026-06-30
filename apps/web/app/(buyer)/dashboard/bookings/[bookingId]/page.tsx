import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import {
  EscrowState,
  LedgerEventType,
  idSchema,
  escrowStateSchema,
} from "@sectoria/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  TaxBreakdownCard,
  TrustBadge,
  formatDate,
} from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { EscrowTimeline } from "@/components/buyer/escrow-timeline";
import { getAuthedApi } from "@/lib/trpc/server";
import { enrichBookings, bookingRef } from "@/lib/buyer/bookings";
import { ESCROW_BADGE, ESCROW_LABEL } from "@/lib/escrow-display";
import { LEDGER_LABEL } from "@/lib/ledger-display";

export const metadata: Metadata = {
  title: "Booking detail",
  robots: { index: false, follow: false },
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const api = await getAuthedApi();

  // NOT_FOUND and FORBIDDEN both render as a 404 — never confirm the existence
  // of a booking the caller may not read (auth-and-access-control.mdc).
  const data = await api.booking
    .getById({ bookingId: idSchema.parse(bookingId) })
    .catch(() => null);
  if (data === null) notFound();

  const { booking, events } = data;
  const [view] = await enrichBookings([booking]);

  return (
    <div>
      <Link
        href="/dashboard/bookings"
        className="mb-4 inline-flex items-center gap-1.5 font-sans text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        All bookings
      </Link>

      <PageHeader
        title={view?.societyName ?? "Booking"}
        description={
          <>
            <span className="font-mono">{bookingRef(booking.id)}</span>
            {view?.categoryLabel ? ` · ${view.categoryLabel}` : null} · Booked{" "}
            {formatDate(booking.createdAt)}
          </>
        }
        action={
          <StatusBadge variant={ESCROW_BADGE[booking.status]}>
            {ESCROW_LABEL[booking.status]}
          </StatusBadge>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Escrow state timeline */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Escrow status</CardTitle>
            <TrustBadge variant="escrow" />
          </CardHeader>
          <CardContent>
            <EscrowTimeline currentState={booking.status} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {/* Tax snapshot (frozen at booking time) */}
          <div>
            <TaxBreakdownCard
              breakdown={booking.taxBreakdown}
              title="Tax snapshot at booking"
            />
            <p className="mt-2 font-sans text-xs text-text-tertiary">
              These figures were locked in when you booked and won&apos;t change
              if rate tables are updated later.
            </p>
          </div>

          {/* Plot allocation */}
          <Card>
            <CardHeader>
              <CardTitle>Plot allocation</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.allocatedPlotId ? (
                <div className="flex items-center gap-2">
                  <StatusBadge variant="success">Plot reserved</StatusBadge>
                  <span className="font-mono text-xs text-text-tertiary">
                    Ref {booking.allocatedPlotId.slice(-6).toUpperCase()}
                  </span>
                </div>
              ) : booking.status === EscrowState.CANCELLED ? (
                <p className="font-sans text-sm text-text-secondary">
                  No plot is held for this cancelled booking.
                </p>
              ) : (
                <p className="font-sans text-sm text-text-secondary">
                  Awaiting plot allocation by the society. You&apos;ll be
                  notified once your plot serial is assigned.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Audit trail */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-4">
            {events.map((event) => {
              const toState =
                event.type === LedgerEventType.ESCROW_TRANSITIONED
                  ? escrowStateSchema.safeParse(event.payload.toState)
                  : null;
              return (
                <li key={event.id} className="flex gap-3">
                  <Clock
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary"
                  />
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-medium text-text-primary">
                      {LEDGER_LABEL[event.type]}
                      {toState?.success
                        ? ` → ${ESCROW_LABEL[toState.data]}`
                        : ""}
                    </p>
                    <p className="font-sans text-xs text-text-tertiary">
                      {formatDate(event.createdAt)}
                      {event.actorRole ? ` · ${event.actorRole}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

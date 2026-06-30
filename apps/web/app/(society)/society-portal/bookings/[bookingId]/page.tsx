import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
  formatDate,
  formatPKR,
} from "@sectoria/ui";
import { EscrowState, type EscrowState as EscrowStateType } from "@sectoria/types";
import { PageHeader } from "@/components/buyer/page-header";
import { EscrowTimeline } from "@/components/buyer/escrow-timeline";
import { BookingQueueActions } from "@/components/society/booking-queue-actions";
import { bookingRef } from "@/lib/buyer/bookings";
import { confirmableAmountPkr } from "@/lib/society/booking-amounts";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";
import { isForbiddenError } from "@/lib/society/trpc-errors";
import { getAuthedApi } from "@/lib/trpc/server";
import { ESCROW_BADGE, ESCROW_LABEL } from "@/lib/escrow-display";

export const metadata: Metadata = {
  title: "Booking detail",
  robots: { index: false, follow: false },
};

const ACTIONABLE: ReadonlySet<EscrowStateType> = new Set([
  EscrowState.BOOKING_TOKEN_PAID,
  EscrowState.INSTALLMENT_DUE,
  EscrowState.FULLY_PAID,
]);

function isActionable(status: EscrowStateType): boolean {
  return ACTIONABLE.has(status);
}

export default async function SocietyBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const admin = await getCurrentSocietyAdmin();
  const api = await getAuthedApi();

  let detail;
  try {
    detail = await api.booking.getById({ bookingId });
  } catch (error) {
    if (isForbiddenError(error)) forbidden();
    notFound();
  }

  const { booking } = detail;
  const category = await api.inventoryCategory.getById({
    categoryId: booking.categoryId,
  });

  if (category.societyId !== admin.societyId) {
    forbidden();
  }

  const [societies, queueRows] = await Promise.all([
    api.society.list(),
    api.booking.listForSociety({}),
  ]);
  const society = societies.find((s) => s.id === category.societyId);
  const queueRow = queueRows.find((row) => row.booking.id === bookingId);
  const buyerName = queueRow?.buyer.name ?? "the buyer";

  const plan = category.paymentPlans.find((p) => p.id === booking.paymentPlanId);
  const amountPkr =
    plan !== undefined ? confirmableAmountPkr(booking, category, plan) : 0;

  return (
    <div>
      <PageHeader
        title={bookingRef(booking.id)}
        description={`${society?.name ?? "Booking"} · ${category.phase} · ${category.block} · ${category.sizeLabel}`}
        action={
          <Button asChild variant="ghost" size="sm">
            <Link href="/society-portal/bookings">← Back to queue</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Escrow progress</CardTitle>
          </CardHeader>
          <CardContent>
            <EscrowTimeline currentState={booking.status} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusBadge variant={ESCROW_BADGE[booking.status]}>
                {ESCROW_LABEL[booking.status]}
              </StatusBadge>
              <p className="font-sans text-xs text-text-tertiary">
                Booked {formatDate(booking.createdAt)}
              </p>
              {plan !== undefined ? (
                <p className="font-mono text-sm font-semibold text-text-primary">
                  Plan: {plan.label}
                </p>
              ) : null}
              {isActionable(booking.status) ? (
                <div className="pt-2">
                  <BookingQueueActions
                    bookingId={booking.id}
                    status={booking.status}
                    amountPkr={amountPkr}
                    buyerName={buyerName}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {isActionable(booking.status) ? (
            <Card className="border-warning-border bg-warning-bg">
              <CardContent className="pt-5">
                <p className="font-sans text-sm font-semibold text-warning-text">
                  Action required
                </p>
                <p className="mt-1 font-sans text-xs text-warning-text/80">
                  {booking.status === EscrowState.BOOKING_TOKEN_PAID
                    ? `Confirm receipt of ${formatPKR(amountPkr)} and allocate a plot.`
                    : booking.status === EscrowState.INSTALLMENT_DUE
                      ? `Confirm installment receipt of ${formatPKR(amountPkr)}.`
                      : `Issue the allotment document for this fully paid booking (${formatPKR(amountPkr)}).`}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

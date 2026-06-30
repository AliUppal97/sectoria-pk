import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatDate,
} from "@sectoria/ui";
import { EscrowState } from "@sectoria/types";
import { PageHeader } from "@/components/buyer/page-header";
import { bookingRef } from "@/lib/buyer/bookings";
import { BookingQueueActions } from "@/components/society/booking-queue-actions";
import { confirmableAmountPkr } from "@/lib/society/booking-amounts";
import { getAuthedApi } from "@/lib/trpc/server";
import { ESCROW_BADGE, ESCROW_LABEL } from "@/lib/escrow-display";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
};

const ACTIONABLE: ReadonlySet<EscrowState> = new Set([
  EscrowState.BOOKING_TOKEN_PAID,
  EscrowState.INSTALLMENT_DUE,
  EscrowState.FULLY_PAID,
]);

function isActionable(status: EscrowState): boolean {
  return ACTIONABLE.has(status);
}

export default async function SocietyBookingsPage() {
  const api = await getAuthedApi();
  const rows = await api.booking.listForSociety({});

  const enriched = await Promise.all(
    rows.map(async (row) => {
      const category = await api.inventoryCategory.getById({
        categoryId: row.booking.categoryId,
      });
      const plan = category.paymentPlans.find(
        (p) => p.id === row.booking.paymentPlanId,
      );
      const amountPkr =
        plan !== undefined
          ? confirmableAmountPkr(row.booking, category, plan)
          : 0;
      return { ...row, amountPkr };
    }),
  );

  return (
    <div>
      <PageHeader
        title="Booking queue"
        description="Incoming bookings awaiting payment confirmation, allocation, or document issuance."
      />

      {enriched.length === 0 ? (
        <Card className="py-6">
          <EmptyState
            icon={ClipboardList}
            heading="No bookings yet"
            description="When buyers book your inventory, their escrow status and required actions appear here."
          />
        </Card>
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {enriched.map((row) => (
              <li key={row.booking.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/society-portal/bookings/${row.booking.id}`}
                        className="font-sans text-sm font-semibold text-text-primary hover:underline"
                      >
                        {row.buyer.name}
                      </Link>
                      <p className="font-sans text-xs text-text-tertiary">
                        {row.categoryLabel ?? "Plot booking"}
                      </p>
                    </div>
                    <StatusBadge variant={ESCROW_BADGE[row.booking.status]}>
                      {ESCROW_LABEL[row.booking.status]}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 flex items-center justify-between font-sans text-xs text-text-tertiary">
                    <span className="font-mono">{bookingRef(row.booking.id)}</span>
                    <span>{formatDate(row.booking.createdAt)}</span>
                  </div>
                  {isActionable(row.booking.status) ? (
                    <div className="mt-3">
                      <BookingQueueActions
                        bookingId={row.booking.id}
                        status={row.booking.status}
                        amountPkr={row.amountPkr}
                        buyerName={row.buyer.name}
                      />
                    </div>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Booked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enriched.map((row) => (
                  <TableRow key={row.booking.id}>
                    <TableCell>
                      <Link
                        href={`/society-portal/bookings/${row.booking.id}`}
                        className="font-sans font-medium text-text-primary hover:underline"
                      >
                        {row.buyer.name}
                      </Link>
                    </TableCell>
                    <TableCell>{row.categoryLabel ?? "—"}</TableCell>
                    <TableCell mono>{bookingRef(row.booking.id)}</TableCell>
                    <TableCell>{formatDate(row.booking.createdAt)}</TableCell>
                    <TableCell>
                      <StatusBadge variant={ESCROW_BADGE[row.booking.status]}>
                        {ESCROW_LABEL[row.booking.status]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isActionable(row.booking.status) ? (
                        <BookingQueueActions
                          bookingId={row.booking.id}
                          status={row.booking.status}
                          amountPkr={row.amountPkr}
                          buyerName={row.buyer.name}
                        />
                      ) : (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/society-portal/bookings/${row.booking.id}`}>
                            View
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

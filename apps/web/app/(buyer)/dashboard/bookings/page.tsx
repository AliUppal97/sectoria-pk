import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
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
import { PageHeader } from "@/components/buyer/page-header";
import { getAuthedApi } from "@/lib/trpc/server";
import { enrichBookings, bookingRef } from "@/lib/buyer/bookings";
import { ESCROW_BADGE, ESCROW_LABEL } from "@/lib/escrow-display";

export const metadata: Metadata = {
  title: "My bookings",
  robots: { index: false, follow: false },
};

export default async function BookingsPage() {
  const api = await getAuthedApi();
  const bookings = await api.booking.listMine();
  const views = await enrichBookings(bookings);

  return (
    <div>
      <PageHeader
        title="My bookings"
        description="Every plot you've booked, with its current escrow status."
        action={
          <Button asChild>
            <Link href="/societies">Browse societies</Link>
          </Button>
        }
      />

      {views.length === 0 ? (
        <Card className="py-6">
          <EmptyState
            icon={FileText}
            heading="You haven't booked a plot yet"
            description="Browse verified societies and reserve a plot through an escrow-protected booking."
            action={
              <Button asChild size="sm">
                <Link href="/societies">Browse societies</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Mobile: stacked card view (no horizontal scroll) */}
          <ul className="flex flex-col gap-3 md:hidden">
            {views.map(({ booking, categoryLabel, societyName }) => (
              <li key={booking.id}>
                <Link href={`/dashboard/bookings/${booking.id}`}>
                  <Card className="p-4 transition-colors hover:bg-surface-subtle">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-sans text-sm font-semibold text-text-primary">
                          {societyName ?? "Booking"}
                        </p>
                        <p className="truncate font-sans text-xs text-text-tertiary">
                          {categoryLabel ?? "Plot booking"}
                        </p>
                      </div>
                      <StatusBadge variant={ESCROW_BADGE[booking.status]}>
                        {ESCROW_LABEL[booking.status]}
                      </StatusBadge>
                    </div>
                    <div className="mt-3 flex items-center justify-between font-sans text-xs text-text-tertiary">
                      <span className="font-mono">{bookingRef(booking.id)}</span>
                      <span>{formatDate(booking.createdAt)}</span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Society & category</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Booked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {views.map(({ booking, categoryLabel, societyName }) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <span className="block font-sans font-medium text-text-primary">
                        {societyName ?? "Booking"}
                      </span>
                      <span className="block font-sans text-xs text-text-tertiary">
                        {categoryLabel ?? "Plot booking"}
                      </span>
                    </TableCell>
                    <TableCell mono>{bookingRef(booking.id)}</TableCell>
                    <TableCell>{formatDate(booking.createdAt)}</TableCell>
                    <TableCell>
                      <StatusBadge variant={ESCROW_BADGE[booking.status]}>
                        {ESCROW_LABEL[booking.status]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/bookings/${booking.id}`}>
                          View
                        </Link>
                      </Button>
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

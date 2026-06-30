import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { EscrowState } from "@sectoria/types";
import {
  Button,
  EmptyState,
  StatusBadge,
  TrustBadge,
  formatDate,
} from "@sectoria/ui";
import { BentoCell, BentoGrid } from "@/components/marketplace/bento";
import { PageHeader } from "@/components/buyer/page-header";
import { getCurrentBuyer } from "@/lib/buyer/current-user";
import { enrichBookings, bookingRef } from "@/lib/buyer/bookings";
import { getAuthedApi } from "@/lib/trpc/server";
import { atlInfo } from "@/lib/atl";
import { ESCROW_BADGE, ESCROW_LABEL } from "@/lib/escrow-display";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

const COMPLETED_STATES = new Set<EscrowState>([
  EscrowState.DOCUMENTS_ISSUED,
  EscrowState.COMMISSION_RELEASED,
]);

export default async function DashboardPage() {
  const [buyer, api] = await Promise.all([getCurrentBuyer(), getAuthedApi()]);
  const bookings = await api.booking.listMine();

  const total = bookings.length;
  const completed = bookings.filter((b) => COMPLETED_STATES.has(b.status)).length;
  const cancelled = bookings.filter(
    (b) => b.status === EscrowState.CANCELLED,
  ).length;
  const active = total - completed - cancelled;

  const atl = atlInfo(buyer.atlStatus);
  const recent = await enrichBookings(bookings.slice(0, 3));
  const firstName = buyer.name.split(" ")[0] ?? buyer.name;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Your verified bookings, escrow status, and tax profile at a glance."
        action={
          <Button asChild>
            <Link href="/societies">
              Browse societies
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <BentoGrid>
        {/* Anchor — identity + tax profile (the trust-defining cell). */}
        <BentoCell size="anchor" tone="navy" className="flex flex-col">
          <p className="font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-inverse/50">
            Your account
          </p>
          <p className="mt-2 font-sans text-2xl font-bold text-text-inverse">
            {buyer.name}
          </p>
          <p className="font-mono text-sm text-text-inverse/60">{buyer.phone}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {buyer.nadraVerified ? (
              <TrustBadge variant="nadra" />
            ) : (
              <StatusBadge variant="warning">Identity not verified</StatusBadge>
            )}
            <TrustBadge variant="escrow" />
          </div>

          <div className="mt-auto pt-6">
            <p className="font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-inverse/50">
              FBR tax status
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <StatusBadge variant={atl.badgeVariant}>{atl.label}</StatusBadge>
            </div>
            <p className="mt-2 font-sans text-sm text-text-inverse/70">
              {atl.implication}
            </p>
          </div>
        </BentoCell>

        <MetricCell label="Total bookings" value={total} />
        <MetricCell label="Active in escrow" value={active} />
        <MetricCell label="Completed" value={completed} />
        <MetricCell label="Cancelled" value={cancelled} />

        {/* Recent bookings */}
        <BentoCell size="wide">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-sans text-md font-semibold text-text-primary">
              Recent bookings
            </h2>
            {total > 0 ? (
              <Link
                href="/dashboard/bookings"
                className="font-sans text-xs font-medium text-text-accent hover:underline"
              >
                View all
              </Link>
            ) : null}
          </div>

          {recent.length === 0 ? (
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
          ) : (
            <ul className="flex flex-col divide-y divide-border-base">
              {recent.map(({ booking, categoryLabel, societyName }) => (
                <li key={booking.id}>
                  <Link
                    href={`/dashboard/bookings/${booking.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-surface-subtle"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-sans text-sm font-medium text-text-primary">
                        {societyName ?? "Booking"}
                      </p>
                      <p className="truncate font-sans text-xs text-text-tertiary">
                        {categoryLabel ?? bookingRef(booking.id)} ·{" "}
                        {formatDate(booking.createdAt)}
                      </p>
                    </div>
                    <StatusBadge variant={ESCROW_BADGE[booking.status]}>
                      {ESCROW_LABEL[booking.status]}
                    </StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </BentoCell>
      </BentoGrid>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <BentoCell size="unit">
      <p className="font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-bold text-text-primary">
        {value}
      </p>
    </BentoCell>
  );
}

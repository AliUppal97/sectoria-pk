import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, MessageSquareQuote } from "lucide-react";
import { EscrowState } from "@sectoria/types";
import {
  Button,
  EmptyState,
  StatusBadge,
  formatDate,
} from "@sectoria/ui";
import { BentoCell, BentoGrid } from "@/components/marketplace/bento";
import { PageHeader } from "@/components/buyer/page-header";
import { QuoteActions } from "@/components/buyer/quote-actions";
import { getCurrentBuyer } from "@/lib/buyer/current-user";
import { enrichBookings, bookingRef } from "@/lib/buyer/bookings";
import { getAuthedApi } from "@/lib/trpc/server";
import { isLegacySelfServeBookingEnabled } from "@/lib/feature-flags";
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
  const legacyEnabled = isLegacySelfServeBookingEnabled();

  const [bookings, quotes, leads] = await Promise.all([
    legacyEnabled ? api.booking.listMine() : Promise.resolve([]),
    api.quote.listForBuyer(),
    api.lead.listMine(),
  ]);

  const firstName = buyer.name.split(" ")[0] ?? buyer.name;
  const activeQuotes = quotes.filter((q) => q.status === "SENT" || q.status === "ACCEPTED");
  const pendingQuotes = quotes.filter((q) => q.status === "SENT");

  if (!legacyEnabled) {
    return (
      <div>
        <PageHeader
          title={`Welcome back, ${firstName}`}
          description="Your quote requests and advisor offers — Sectoria negotiates the best authorized-dealer price for you."
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
          <BentoCell size="anchor" tone="navy" className="flex flex-col">
            <p className="font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-inverse/50">
              Your account
            </p>
            <p className="mt-2 font-sans text-2xl font-bold text-text-inverse">
              {buyer.name}
            </p>
            <p className="font-mono text-sm text-text-inverse/60">{buyer.phone}</p>
            <p className="mt-auto pt-6 font-sans text-sm text-text-inverse/70">
              Need help?{" "}
              <Link href="/support" className="underline">
                Contact an advisor
              </Link>
            </p>
          </BentoCell>

          <MetricCell label="Quote requests" value={leads.length} />
          <MetricCell label="Active quotes" value={activeQuotes.length} />
          <MetricCell label="Awaiting response" value={pendingQuotes.length} />
          <MetricCell
            label="Token paid"
            value={quotes.filter((q) => q.tokenPaid).length}
          />

          <BentoCell size="wide">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-sans text-md font-semibold text-text-primary">
                Active quotes
              </h2>
              {quotes.length > 0 ? (
                <Link
                  href="/dashboard/quotes"
                  className="font-sans text-xs font-medium text-text-accent hover:underline"
                >
                  View all
                </Link>
              ) : null}
            </div>

            {activeQuotes.length === 0 ? (
              <EmptyState
                icon={MessageSquareQuote}
                heading="No active quotes"
                description="Compare societies and request the best price — your advisor quotes appear here."
                action={
                  <Button asChild size="sm">
                    <Link href="/support">Request a quote</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-4">
                {activeQuotes.slice(0, 2).map((quote) => (
                  <li
                    key={quote.id}
                    className="rounded-lg border border-border-base p-4"
                  >
                    <QuoteActions quote={quote} />
                  </li>
                ))}
              </ul>
            )}
          </BentoCell>
        </BentoGrid>
      </div>
    );
  }

  const total = bookings.length;
  const completed = bookings.filter((b) => COMPLETED_STATES.has(b.status)).length;
  const cancelled = bookings.filter(
    (b) => b.status === EscrowState.CANCELLED,
  ).length;
  const active = total - completed - cancelled;
  const recent = await enrichBookings(bookings.slice(0, 3));

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Your verified bookings and escrow status at a glance."
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
        <MetricCell label="Total bookings" value={total} />
        <MetricCell label="Active in escrow" value={active} />
        <MetricCell label="Completed" value={completed} />
        <MetricCell label="Cancelled" value={cancelled} />

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

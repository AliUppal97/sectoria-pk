import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { EscrowState, VerificationTier } from "@sectoria/types";
import {
  Button,
  EmptyState,
  StatusBadge,
  TrustBadge,
  formatDate,
} from "@sectoria/ui";
import { BentoCell, BentoGrid } from "@/components/marketplace/bento";
import { TrustScoreGauge } from "@/components/marketplace/trust-score-gauge";
import { PageHeader } from "@/components/buyer/page-header";
import { bookingRef } from "@/lib/buyer/bookings";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";
import { denyIfForbidden } from "@/lib/society/trpc-errors";
import { getAuthedApi } from "@/lib/trpc/server";
import { ESCROW_BADGE, ESCROW_LABEL } from "@/lib/escrow-display";

export const metadata: Metadata = {
  title: "Society portal",
  robots: { index: false, follow: false },
};

export default async function SocietyPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ societyId?: string }>;
}) {
  const [{ societyId: querySocietyId }, admin] = await Promise.all([
    searchParams,
    getCurrentSocietyAdmin(),
  ]);

  const api = await getAuthedApi();
  let overview;
  try {
    overview = await api.society.getPortalOverview({
      ...(querySocietyId !== undefined ? { societyId: querySocietyId } : {}),
    });
  } catch (error) {
    denyIfForbidden(error);
  }

  const pendingBookings = await api.booking.listForSociety({
    statuses: [
      EscrowState.BOOKING_TOKEN_PAID,
      EscrowState.INSTALLMENT_DUE,
      EscrowState.FULLY_PAID,
    ],
  });

  const { society, complianceScore, metrics } = overview;
  const firstName = admin.name.split(" ")[0] ?? admin.name;

  return (
    <div>
      <PageHeader
        title={`${society.name} overview`}
        description={`Welcome back, ${firstName}. Compliance, inventory, and booking queue at a glance.`}
        action={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/societies/${society.citySlug}/${society.slug}`}>
              View public profile
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <BentoGrid>
        <BentoCell size="anchor" tone="navy" className="flex flex-col">
          <p className="font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-inverse/50">
            Compliance score
          </p>
          <div className="mt-4 flex items-center gap-5">
            <TrustScoreGauge
              score={complianceScore}
              className="[&_span]:text-text-inverse [&_.text-text-primary]:text-text-inverse"
            />
            <div>
              <p className="font-sans text-sm text-text-inverse/70">
                Based on verified transfers, buyer ratings, and your LOP/NOC/HSMS
                documentation completeness.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {society.verificationTier === VerificationTier.HSMS_LINKED ? (
                  <>
                    <TrustBadge variant="plra" />
                    <StatusBadge variant="success">HSMS linked</StatusBadge>
                  </>
                ) : society.verificationTier === VerificationTier.VERIFIED ? (
                  <TrustBadge variant="plra" />
                ) : (
                  <StatusBadge variant="warning">Docs pending</StatusBadge>
                )}
              </div>
            </div>
          </div>
          <div className="mt-auto pt-6">
            <p className="font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-inverse/50">
              HSMS status
            </p>
            <StatusBadge
              variant={society.hsmsLinked ? "success" : "neutral"}
              className="mt-2"
            >
              {society.hsmsLinked
                ? "Live HSMS integration"
                : "Not linked — upload LOP/NOC in Settings"}
            </StatusBadge>
          </div>
        </BentoCell>

        <MetricCell label="Active bookings" value={metrics.activeBookings} />
        <MetricCell label="Awaiting action" value={metrics.pendingQueue} />
        <MetricCell label="Categories" value={metrics.categoryCount} />
        <MetricCell label="Units available" value={metrics.availableUnits} />

        <BentoCell size="wide">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-sans text-md font-semibold text-text-primary">
              Booking confirmation queue
            </h2>
            {pendingBookings.length > 0 ? (
              <Link
                href="/society-portal/bookings"
                className="font-sans text-xs font-medium text-text-accent hover:underline"
              >
                View all
              </Link>
            ) : null}
          </div>

          {pendingBookings.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              heading="No bookings awaiting action"
              description="Incoming bookings that need payment confirmation or document issuance will appear here."
              action={
                <Button asChild size="sm" variant="ghost">
                  <Link href="/society-portal/bookings">Open bookings</Link>
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border-base">
              {pendingBookings.slice(0, 5).map((row) => (
                <li key={row.booking.id}>
                  <Link
                    href={`/society-portal/bookings/${row.booking.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-surface-subtle"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-sans text-sm font-medium text-text-primary">
                        {row.buyer.name}
                      </p>
                      <p className="truncate font-sans text-xs text-text-tertiary">
                        {row.categoryLabel ?? "Plot booking"} ·{" "}
                        {bookingRef(row.booking.id)} ·{" "}
                        {formatDate(row.booking.createdAt)}
                      </p>
                    </div>
                    <StatusBadge variant={ESCROW_BADGE[row.booking.status]}>
                      {ESCROW_LABEL[row.booking.status]}
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

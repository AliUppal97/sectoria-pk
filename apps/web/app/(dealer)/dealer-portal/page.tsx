import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import {
  Button,
  EmptyState,
  StatusBadge,
  TrustBadge,
  formatDate,
} from "@sectoria/ui";
import { BentoCell, BentoGrid } from "@/components/marketplace/bento";
import { AnimatedTrustScoreGauge } from "@/components/dealer/animated-trust-score-gauge";
import { PageHeader } from "@/components/buyer/page-header";
import { bookingRef } from "@/lib/buyer/bookings";
import { getCurrentDealer } from "@/lib/dealer/current-dealer";
import { getAuthedApi } from "@/lib/trpc/server";
import { ESCROW_BADGE, ESCROW_LABEL } from "@/lib/escrow-display";

export const metadata: Metadata = {
  title: "Dealer portal",
  robots: { index: false, follow: false },
};

export default async function DealerPortalPage() {
  const dealer = await getCurrentDealer();
  const api = await getAuthedApi();
  const [overview, leads] = await Promise.all([
    api.dealer.getPortalOverview(),
    api.dealer.listLeads(),
  ]);

  const { dealer: profile, metrics, trustScore, authorizedSocieties } =
    overview;
  const firstName = dealer.name.split(" ")[0] ?? dealer.name;

  return (
    <div>
      <PageHeader
        title={`${profile.agencyName} overview`}
        description={`Welcome back, ${firstName}. Your authorizations, lead pipeline, and trust score at a glance.`}
        action={
          <Button asChild variant="ghost" size="sm">
            <Link href={`/dealers/${profile.slug}`}>
              View public profile
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <BentoGrid>
        <BentoCell size="anchor" tone="navy" className="flex flex-col">
          <p className="font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-inverse/50">
            Trust score
          </p>
          <div className="mt-4 flex items-center gap-5">
            {trustScore ? (
              <AnimatedTrustScoreGauge
                score={trustScore.score}
                className="[&_span]:text-text-inverse [&_.text-text-primary]:text-text-inverse"
              />
            ) : (
              <p className="font-sans text-sm text-text-inverse/70">
                Trust score is being calculated.
              </p>
            )}
            <div>
              <p className="font-sans text-sm text-text-inverse/70">
                Based on verified transfers, buyer ratings, and DNFBP
                registration completeness.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.dnfbpVerified ? (
                  <TrustBadge variant="dnfbp" />
                ) : (
                  <StatusBadge
                    variant="warning"
                    title="Submit your DNFBP certificate to unlock the verification component of your score."
                  >
                    DNFBP pending
                  </StatusBadge>
                )}
              </div>
            </div>
          </div>
          <div className="mt-auto pt-6">
            <Link
              href="/dealer-portal/trust-score"
              className="font-sans text-xs font-medium text-text-inverse/80 hover:text-text-inverse hover:underline"
            >
              View score breakdown
            </Link>
          </div>
        </BentoCell>

        <MetricCell label="Open leads" value={metrics.leadCount} />
        <MetricCell
          label="Authorized societies"
          value={metrics.authorizedSocietyCount}
        />
        <MetricCell label="Completed deals" value={metrics.completedDeals} />
        <MetricCell
          label="DNFBP status"
          value={profile.dnfbpVerified ? 1 : 0}
          display={
            profile.dnfbpVerified ? (
              <StatusBadge variant="success">Verified</StatusBadge>
            ) : (
              <StatusBadge variant="warning">Pending</StatusBadge>
            )
          }
        />

        <BentoCell size="wide">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-sans text-md font-semibold text-text-primary">
              Recent leads
            </h2>
            {leads.length > 0 ? (
              <Link
                href="/dealer-portal/leads"
                className="font-sans text-xs font-medium text-text-accent hover:underline"
              >
                View all
              </Link>
            ) : null}
          </div>

          {leads.length === 0 ? (
            <EmptyState
              icon={Users}
              heading="No buyer enquiries yet"
              description="Bookings from societies you're authorized for will appear here with buyer identity and tax status."
              action={
                <Button asChild size="sm" variant="ghost">
                  <Link href="/dealer-portal/leads">Open lead pipeline</Link>
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border-base">
              {leads.slice(0, 5).map((row) => (
                <li key={row.booking.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-sans text-sm font-medium text-text-primary">
                        {row.buyer.name}
                      </p>
                      <p className="truncate font-sans text-xs text-text-tertiary">
                        {row.society?.name ?? "Society"} ·{" "}
                        {row.categoryLabel ?? "Plot"} ·{" "}
                        {bookingRef(row.booking.id)} ·{" "}
                        {formatDate(row.booking.createdAt)}
                      </p>
                    </div>
                    <StatusBadge variant={ESCROW_BADGE[row.booking.status]}>
                      {ESCROW_LABEL[row.booking.status]}
                    </StatusBadge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </BentoCell>

        <BentoCell size="wide">
          <h2 className="font-sans text-md font-semibold text-text-primary">
            Authorized societies
          </h2>
          {authorizedSocieties.length === 0 ? (
            <p className="mt-2 font-sans text-sm text-text-tertiary">
              No active society authorizations. Contact a society administrator
              to become an authorized sales partner.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {authorizedSocieties.map((society) => (
                <li key={society.id}>
                  <Link
                    href={`/societies/${society.citySlug}/${society.slug}`}
                    className="font-sans text-sm font-medium text-text-accent hover:underline"
                  >
                    {society.name}
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

function MetricCell({
  label,
  value,
  display,
}: {
  label: string;
  value: number;
  display?: ReactNode;
}) {
  return (
    <BentoCell size="unit">
      <p className="font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">
        {label}
      </p>
      {display ?? (
        <p className="mt-2 font-mono text-3xl font-bold text-text-primary">
          {value}
        </p>
      )}
    </BentoCell>
  );
}

import Link from "next/link";
import { Users } from "lucide-react";
import {
  Button,
  EmptyState,
  StatusBadge,
  TrustBadge,
  formatDate,
} from "@sectoria/ui";
import type { AtlStatus as AtlStatusType, EscrowState } from "@sectoria/types";
import { atlInfo } from "@/lib/atl";
import { ESCROW_BADGE, ESCROW_LABEL } from "@/lib/escrow-display";
import { bookingRef } from "@/lib/buyer/bookings";

export interface LeadRow {
  booking: {
    id: string;
    status: EscrowState;
    createdAt: Date;
    dealerId: string | null;
  };
  buyer: {
    id: string;
    name: string;
    nadraVerified: boolean;
    atlStatus: AtlStatusType;
  };
  society: {
    id: string;
    name: string;
    slug: string;
    citySlug: string;
  } | null;
  categoryLabel: string | null;
}

/**
 * Lead pipeline list — mobile-first stacked cards with NADRA badge, ATL status,
 * and the tax implication beneath each buyer (ui-ux-excellence-sectoria.mdc).
 */
export function LeadPipelineList({ leads }: { leads: LeadRow[] }) {
  if (leads.length === 0) {
    return (
      <EmptyState
        icon={Users}
        heading="No buyer enquiries yet"
        description="When buyers book plots in societies you're authorized for, their enquiries will appear here with identity and tax status."
        action={
          <Button asChild variant="ghost" size="sm">
            <Link href="/societies">Browse authorized societies</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {leads.map((lead) => {
        const atl = atlInfo(lead.buyer.atlStatus);
        return (
          <li
            key={lead.booking.id}
            className="rounded-xl border border-border-base bg-surface-card p-4 shadow-xs"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-sans text-sm font-semibold text-text-primary">
                  {lead.buyer.name}
                </p>
                <p className="mt-0.5 font-sans text-xs text-text-tertiary">
                  {lead.society?.name ?? "Society"} ·{" "}
                  {lead.categoryLabel ?? "Plot booking"} ·{" "}
                  {bookingRef(lead.booking.id)} ·{" "}
                  {formatDate(lead.booking.createdAt)}
                </p>
                {lead.society ? (
                  <Link
                    href={`/societies/${lead.society.citySlug}/${lead.society.slug}`}
                    className="mt-1 inline-block font-sans text-xs font-medium text-text-accent hover:underline"
                  >
                    View society profile
                  </Link>
                ) : null}
              </div>
              <StatusBadge variant={ESCROW_BADGE[lead.booking.status]}>
                {ESCROW_LABEL[lead.booking.status]}
              </StatusBadge>
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-border-base pt-4">
              <div className="flex flex-wrap items-center gap-2">
                {lead.buyer.nadraVerified ? (
                  <TrustBadge variant="nadra" />
                ) : (
                  <StatusBadge
                    variant="warning"
                    title="This buyer has not completed NADRA CNIC verification yet."
                  >
                    NADRA not verified
                  </StatusBadge>
                )}
                <StatusBadge variant={atl.badgeVariant} title={atl.implication}>
                  FBR {atl.label}
                </StatusBadge>
              </div>
              <p className="font-sans text-xs text-text-secondary">
                {atl.implication}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

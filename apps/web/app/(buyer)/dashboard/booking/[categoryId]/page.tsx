import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EscrowState, idSchema } from "@sectoria/types";
import { lookupFbrValuation } from "@sectoria/domain-tax";
import { PageHeader } from "@/components/buyer/page-header";
import { getAuthedApi } from "@/lib/trpc/server";
import { getCurrentBuyer } from "@/lib/buyer/current-user";
import { isLegacySelfServeBookingEnabled } from "@/lib/feature-flags";
import {
  BookingWizard,
  type WizardPlan,
} from "@/components/buyer/booking-wizard";

export const metadata: Metadata = {
  title: "Book a plot",
  robots: { index: false, follow: false },
};

export default async function BookingWizardPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  if (!isLegacySelfServeBookingEnabled()) {
    redirect("/dashboard/quotes");
  }

  const { categoryId } = await params;
  const api = await getAuthedApi();
  const buyer = await getCurrentBuyer();

  const category = await api.inventoryCategory
    .getById({ categoryId: idSchema.parse(categoryId) })
    .catch(() => null);
  if (category === null) notFound();

  const [societies, myBookings] = await Promise.all([
    api.society.list(),
    api.booking.listMine(),
  ]);
  const society =
    societies.find((entry) => entry.id === category.societyId) ?? null;

  // A live booking already exists for this category → the wizard resumes at the
  // confirmation step rather than letting the buyer double-book.
  const existing =
    myBookings.find(
      (booking) =>
        booking.categoryId === category.id &&
        booking.status !== EscrowState.CANCELLED,
    ) ?? null;

  const plotPrice = Math.round(category.sizeSqft * Number(category.pricePerSqft));
  // The FBR table value is a government figure derived from the plot's valuation
  // zone — read-only in the wizard, not a buyer-entered number. Falls back to the
  // plot price when no valuation is on record for the zone.
  const fbrValuation = lookupFbrValuation({
    zone: category.fbrValuationZone,
    plotType: category.plotType,
    sizeSqft: category.sizeSqft,
  });
  const plans: WizardPlan[] = category.paymentPlans.map((plan) => ({
    id: plan.id,
    label: plan.label,
    downPaymentPct: plan.downPaymentPct,
    installmentCount: plan.installmentCount,
    installmentInterval: plan.installmentInterval,
  }));

  return (
    <div>
      <Link
        href="/dashboard/bookings"
        className="mb-4 inline-flex items-center gap-1.5 font-sans text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        My bookings
      </Link>

      <PageHeader
        title={`Book a plot${society ? ` in ${society.name}` : ""}`}
        description={`${category.phase} · ${category.block} · ${category.sizeLabel}`}
      />

      <BookingWizard
        category={{
          id: category.id,
          phase: category.phase,
          block: category.block,
          sizeLabel: category.sizeLabel,
          plotType: category.plotType,
          allocationStrategy: category.allocationStrategy,
          societyName: society?.name ?? null,
        }}
        plans={plans}
        defaultSalePrice={plotPrice}
        fbrTableValue={fbrValuation ?? plotPrice}
        fbrOnRecord={fbrValuation !== null}
        fbrZone={category.fbrValuationZone}
        nadraVerified={buyer.nadraVerified}
        atlStatus={buyer.atlStatus}
        existingBooking={
          existing
            ? {
                id: existing.id,
                status: existing.status,
                createdAt: existing.createdAt,
              }
            : null
        }
      />
    </div>
  );
}

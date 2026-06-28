import type { Meta, StoryObj } from "@storybook/react-vite";
import type { TaxBreakdown } from "@sectoria/types";
import {
  TaxBreakdownCard,
  TaxBreakdownCardSkeleton,
} from "./tax-breakdown-card";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { StatusBadge } from "./badge";
import { Button } from "./button";
import { Calculator } from "lucide-react";

// Demo breakdown (whole rupees, on a PKR 14,200,000 property). Shape matches
// @sectoria/domain/tax output; cast past the branded PkrAmount type for the
// story fixture only.
const demoBreakdown = {
  section236C: 0,
  section236K: 426_000,
  section7E: 0,
  stampDuty: 284_000,
  regulatoryFee: 142_000,
  total: 852_000,
  breakdown: [
    { label: "Section 236K — purchase advance tax (3%)", amount: 426_000 },
    { label: "Stamp duty (2%)", amount: 284_000 },
    { label: "Regulatory / transfer fee (1%)", amount: 142_000 },
  ],
} as unknown as TaxBreakdown;

const meta = {
  title: "Domain/TaxBreakdownCard",
  component: TaxBreakdownCard,
} satisfies Meta<typeof TaxBreakdownCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: { breakdown: demoBreakdown },
  render: (args) => (
    <div className="max-w-sm">
      <TaxBreakdownCard {...args} />
    </div>
  ),
};

export const Loading: Story = {
  args: { breakdown: demoBreakdown },
  render: () => (
    <div className="max-w-sm">
      <TaxBreakdownCardSkeleton />
    </div>
  ),
};

export const Empty: Story = {
  args: { breakdown: demoBreakdown },
  render: () => (
    <div className="max-w-sm rounded-md border border-border-base bg-surface-subtle">
      <EmptyState
        icon={Calculator}
        heading="Enter property details to calculate tax"
        description="Your Section 236K, stamp duty and fees appear here once you add a sale price and ATL status."
      />
    </div>
  ),
};

export const Error: Story = {
  args: { breakdown: demoBreakdown },
  render: () => (
    <div className="max-w-sm rounded-md border border-border-base bg-surface-subtle">
      <ErrorState
        title="Couldn't calculate tax"
        message="The FBR valuation table was unavailable. Try again in a moment."
        onRetry={() => undefined}
      />
    </div>
  ),
};

/** Partial: figures shown, but a government input is still pending. */
export const Partial: Story = {
  args: { breakdown: demoBreakdown },
  render: (args) => (
    <div className="flex max-w-sm flex-col gap-2">
      <StatusBadge variant="warning">
        FBR ATL status pending — rates may change
      </StatusBadge>
      <TaxBreakdownCard {...args} title="Estimated tax & fees" />
      <Button variant="ghost" size="sm">
        Re-check filer status
      </Button>
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import type { PlraCertificate } from "@sectoria/types";
import {
  CertificateCard,
  CertificateCardSkeleton,
} from "./certificate-card";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { StatusBadge } from "./badge";
import { FileText } from "lucide-react";

// Demo certificate; cast past branded scalar types for the fixture only.
const certificate = {
  transferId: "transfer_abc123",
  certificateNumber: "PLRA-GV-2026-04417",
  issuedAt: "2026-06-22T11:05:00.000Z",
  documentUrl: "https://plra.punjab.gov.pk/c/PLRA-GV-2026-04417",
} as unknown as PlraCertificate;

const details = [
  { label: "Society", value: "Green Valley Housing Scheme" },
  { label: "Plot", value: "Phase 2, Block C — Plot 145" },
  { label: "Owner", value: "Ayesha Khan" },
  { label: "Size", value: "5 Marla" },
];

const meta = {
  title: "Domain/CertificateCard",
  component: CertificateCard,
  parameters: { backgrounds: { default: "surface" } },
} satisfies Meta<typeof CertificateCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: { certificate, details },
  render: (args) => (
    <div className="max-w-md">
      <CertificateCard {...args} />
    </div>
  ),
};

export const Loading: Story = {
  args: { certificate },
  render: () => (
    <div className="max-w-md">
      <CertificateCardSkeleton />
    </div>
  ),
};

export const Empty: Story = {
  args: { certificate },
  render: () => (
    <div className="max-w-md rounded-lg border border-border-base bg-surface-card">
      <EmptyState
        icon={FileText}
        heading="No certificate issued yet"
        description="The PLRA certificate is generated once the transfer completes."
      />
    </div>
  ),
};

export const Error: Story = {
  args: { certificate },
  render: () => (
    <div className="max-w-md rounded-lg border border-border-base bg-surface-card">
      <ErrorState
        title="Certificate generation failed"
        message="PLRA didn't return a certificate. The transfer is unaffected — we'll retry automatically."
        onRetry={() => undefined}
      />
    </div>
  ),
};

/** Partial: transfer recorded, certificate still being generated. */
export const Partial: Story = {
  args: { certificate },
  render: (args) => (
    <div className="flex max-w-md flex-col gap-2">
      <StatusBadge variant="info">
        Generating certificate — this can take a moment
      </StatusBadge>
      <CertificateCard {...args} details={details} />
    </div>
  ),
};

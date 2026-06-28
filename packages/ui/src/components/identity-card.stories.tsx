import type { Meta, StoryObj } from "@storybook/react-vite";
import type { NadraVerificationResult } from "@sectoria/types";
import { IdentityCard, IdentityCardSkeleton } from "./identity-card";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { StatusBadge } from "./badge";
import { Fingerprint } from "lucide-react";

// Demo NADRA result; cast past branded scalar types for the fixture only.
const verified = {
  verified: true,
  cnic: "35202-1234567-1",
  fullName: "Ayesha Khan",
  fatherName: "Muhammad Khan",
  dateOfBirth: "1992-04-18T00:00:00.000Z",
  biometricConfidence: 0.98,
  verifiedAt: "2026-06-20T09:30:00.000Z",
} as unknown as NadraVerificationResult;

const unverified = {
  ...verified,
  verified: false,
  biometricConfidence: 0.41,
} as unknown as NadraVerificationResult;

const meta = {
  title: "Domain/IdentityCard",
  component: IdentityCard,
} satisfies Meta<typeof IdentityCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: { result: verified },
  render: (args) => (
    <div className="max-w-md">
      <IdentityCard {...args} />
    </div>
  ),
};

export const Loading: Story = {
  args: { result: verified },
  render: () => (
    <div className="max-w-md">
      <IdentityCardSkeleton />
    </div>
  ),
};

export const Empty: Story = {
  args: { result: verified },
  render: () => (
    <div className="max-w-md rounded-lg border border-border-base bg-surface-card">
      <EmptyState
        icon={Fingerprint}
        heading="Identity not verified yet"
        description="Verify your CNIC with NADRA to continue your booking."
      />
    </div>
  ),
};

export const Error: Story = {
  args: { result: verified },
  render: () => (
    <div className="max-w-md rounded-lg border border-border-base bg-surface-card">
      <ErrorState
        title="NADRA verification failed"
        message="We couldn't reach NADRA. Your details are saved — try verifying again."
        onRetry={() => undefined}
      />
    </div>
  ),
};

/** Partial/degraded: a returned-but-low-confidence biometric match. */
export const Partial: Story = {
  args: { result: unverified },
  render: (args) => (
    <div className="flex max-w-md flex-col gap-2">
      <StatusBadge variant="warning">
        Low biometric confidence — manual review needed
      </StatusBadge>
      <IdentityCard {...args} />
    </div>
  ),
};

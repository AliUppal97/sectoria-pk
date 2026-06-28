import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusBadge, TrustBadge } from "./badge";

const meta = {
  title: "Status/Badge",
  component: StatusBadge,
  parameters: { layout: "centered" },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: { variant: "success", children: "Verified" },
};

export const Warning: Story = {
  args: { variant: "warning", children: "Pending" },
};

export const Danger: Story = {
  args: { variant: "danger", children: "Non-filer" },
};

export const Info: Story = {
  args: { variant: "info", children: "In progress" },
};

export const Neutral: Story = {
  args: { variant: "neutral", children: "Draft" },
};

export const AllSemanticVariants: Story = {
  args: { children: "Badge" },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge variant="success">Verified</StatusBadge>
      <StatusBadge variant="warning">Awaiting NADRA</StatusBadge>
      <StatusBadge variant="danger">Rejected</StatusBadge>
      <StatusBadge variant="info">In progress</StatusBadge>
      <StatusBadge variant="neutral">Draft</StatusBadge>
    </div>
  ),
};

export const TrustBadges: Story = {
  args: { children: "Badge" },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <TrustBadge variant="plra" />
      <TrustBadge variant="nadra" />
      <TrustBadge variant="fbrFiler" />
      <TrustBadge variant="escrow" />
      <TrustBadge variant="dnfbp" />
    </div>
  ),
};

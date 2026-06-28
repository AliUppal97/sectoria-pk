import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProgressBar } from "./progress-bar";

const meta = {
  title: "Primitives/ProgressBar",
  component: ProgressBar,
  args: { value: 60 },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 60, label: "Development progress", showValue: true },
  render: (args) => (
    <div className="w-80">
      <ProgressBar {...args} />
    </div>
  ),
};

export const Stages: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-5">
      <ProgressBar value={20} label="Land development" showValue />
      <ProgressBar value={65} label="Possession underway" showValue />
      <ProgressBar value={100} label="Completed" showValue />
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Building2, SearchX } from "lucide-react";
import { EmptyState } from "./empty-state";
import { Button } from "./button";
import { Card } from "./card";

const meta = {
  title: "States/EmptyState",
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoFilterMatches: Story = {
  args: { heading: "No societies match your filters" },
  render: () => (
    <Card className="max-w-xl">
      <EmptyState
        icon={SearchX}
        heading="No societies match your filters"
        description="Try widening your price range or removing the authority filter."
        action={<Button variant="ghost">Clear filters</Button>}
      />
    </Card>
  ),
};

export const NoListingsYet: Story = {
  args: { heading: "You haven't listed any societies yet" },
  render: () => (
    <Card className="max-w-xl">
      <EmptyState
        icon={Building2}
        heading="You haven't listed any societies yet"
        description="List your society to start receiving verified bookings."
        action={<Button>List your society</Button>}
      />
    </Card>
  ),
};

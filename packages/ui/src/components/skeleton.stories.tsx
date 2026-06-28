import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./skeleton";
import { Card } from "./card";

const meta = {
  title: "Primitives/Skeleton",
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Lines: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ),
};

/** A skeleton matching the shape of a society card grid (design spec §5.10). */
export const ContentShapedCards: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="flex flex-col gap-2 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-2 h-9 w-full" />
          </div>
        </Card>
      ))}
    </div>
  ),
};

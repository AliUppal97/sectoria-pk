import type { Meta, StoryObj } from "@storybook/react-vite";
import { ErrorState } from "./error-state";
import { Card } from "./card";

const meta = {
  title: "States/ErrorState",
  component: ErrorState,
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithRetryAndSupport: Story = {
  args: { message: "The listing failed to load." },
  render: () => (
    <Card className="max-w-xl">
      <ErrorState
        title="We couldn't load this society"
        message="The listing failed to load. Check your connection and try again — your filters are saved."
        onRetry={() => undefined}
        supportHref="mailto:support@sectoria.pk"
      />
    </Card>
  ),
};

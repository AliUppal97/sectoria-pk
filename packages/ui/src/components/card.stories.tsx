import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Button } from "./button";
import { StatusBadge } from "./badge";

const meta = {
  title: "Primitives/Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bahria Town — Phase 8</CardTitle>
          <StatusBadge variant="success">Verified</StatusBadge>
        </div>
        <CardDescription>Rawalpindi, Punjab</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-sans text-sm text-text-secondary">
          A self-contained 5 Marla residential block with possession underway
          and LDA-approved layout.
        </p>
      </CardContent>
      <CardFooter>
        <Button className="w-full">View category</Button>
      </CardFooter>
    </Card>
  ),
};

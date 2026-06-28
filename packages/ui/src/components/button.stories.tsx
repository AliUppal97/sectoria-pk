import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";

const meta = {
  title: "Primitives/Button",
  component: Button,
  parameters: { layout: "centered" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "success", "ghost", "destructive"],
    },
    size: { control: "select", options: ["sm", "default", "lg"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { children: "Book this plot", variant: "primary" },
};

export const Success: Story = {
  args: { children: "Confirm payment", variant: "success" },
};

export const Ghost: Story = {
  args: { children: "Cancel", variant: "ghost" },
};

export const Destructive: Story = {
  args: { children: "Cancel booking", variant: "destructive" },
};

export const Disabled: Story = {
  args: { children: "Book this plot", disabled: true },
};

export const AllVariantsAndSizes: Story = {
  args: { children: "Button" },
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="success">Success</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
      </div>
    </div>
  ),
};

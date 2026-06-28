import type { Meta, StoryObj } from "@storybook/react-vite";
import { FieldError, Input, Label } from "./input";

const meta = {
  title: "Primitives/Input",
  component: Input,
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-1.5">
      <Label htmlFor="name">Full name</Label>
      <Input id="name" placeholder="As printed on your CNIC" />
    </div>
  ),
};

export const CnicMono: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-1.5">
      <Label htmlFor="cnic">CNIC</Label>
      <Input id="cnic" mono placeholder="XXXXX-XXXXXXX-X" />
    </div>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-1.5">
      <Label htmlFor="cnic-err">CNIC</Label>
      <Input
        id="cnic-err"
        mono
        invalid
        defaultValue="35202-12"
        aria-describedby="cnic-err-msg"
      />
      <FieldError id="cnic-err-msg">
        CNIC must be 13 digits in the format XXXXX-XXXXXXX-X
      </FieldError>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-1.5">
      <Label htmlFor="disabled">Email</Label>
      <Input id="disabled" disabled defaultValue="locked@example.pk" />
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Label } from "./input";

const meta = {
  title: "Primitives/Select",
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-1.5">
      <Label htmlFor="city">City</Label>
      <Select>
        <SelectTrigger id="city">
          <SelectValue placeholder="Select a city" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="lahore">Lahore</SelectItem>
          <SelectItem value="islamabad">Islamabad</SelectItem>
          <SelectItem value="karachi">Karachi</SelectItem>
          <SelectItem value="rawalpindi">Rawalpindi</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

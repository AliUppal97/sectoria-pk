import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { StatusBadge } from "./badge";
import { formatPKR } from "../lib/format-pkr";

const meta = {
  title: "Primitives/Table",
  component: Table,
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
  { category: "Phase 2 — 5 Marla", price: 14_200_000, status: "Verified" },
  { category: "Phase 2 — 10 Marla", price: 26_500_000, status: "Verified" },
  { category: "Commercial — 4 Marla", price: 89_000_000, status: "Pending" },
];

export const Default: Story = {
  render: () => (
    <Table className="max-w-2xl">
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead>Starting price</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.category}>
            <TableCell>{row.category}</TableCell>
            <TableCell mono>{formatPKR(row.price)}</TableCell>
            <TableCell>
              <StatusBadge
                variant={row.status === "Verified" ? "success" : "warning"}
              >
                {row.status}
              </StatusBadge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

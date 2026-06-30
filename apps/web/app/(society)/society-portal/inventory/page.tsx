import type { Metadata } from "next";
import Link from "next/link";
import { Package, Plus } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatPKR,
} from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Inventory",
  robots: { index: false, follow: false },
};

export default async function InventoryPage() {
  const admin = await getCurrentSocietyAdmin();
  const api = await getAuthedApi();
  const categories = await api.inventoryCategory.listBySociety({
    societyId: admin.societyId,
  });

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Manage plot categories, pricing, and availability for your society."
        action={
          <Button asChild>
            <Link href="/society-portal/inventory/new">
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add category
            </Link>
          </Button>
        }
      />

      {categories.length === 0 ? (
        <Card className="py-6">
          <EmptyState
            icon={Package}
            heading="No inventory categories yet"
            description="Create your first plot category with pricing and allocation rules."
            action={
              <Button asChild size="sm">
                <Link href="/society-portal/inventory/new">Add category</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:hidden">
            {categories.map((category) => {
              const listPrice = Math.round(
                Number(category.pricePerSqft) * category.sizeSqft,
              );
              return (
                <li key={category.id}>
                  <Link href={`/society-portal/inventory/${category.id}`}>
                    <Card className="p-4 transition-colors hover:bg-surface-subtle">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-sans text-sm font-semibold text-text-primary">
                            {category.phase} · {category.block}
                          </p>
                          <p className="font-sans text-xs text-text-tertiary">
                            {category.sizeLabel} · {category.plotType}
                          </p>
                        </div>
                        <StatusBadge
                          variant={
                            category.availableUnits > 0 ? "success" : "warning"
                          }
                        >
                          {category.availableUnits} available
                        </StatusBadge>
                      </div>
                      <p className="mt-2 font-mono text-sm font-semibold text-text-primary">
                        {formatPKR(listPrice)}
                      </p>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phase / block</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>List price</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  const listPrice = Math.round(
                    Number(category.pricePerSqft) * category.sizeSqft,
                  );
                  return (
                    <TableRow key={category.id}>
                      <TableCell>
                        <span className="block font-sans font-medium text-text-primary">
                          {category.phase} · {category.block}
                        </span>
                        <span className="block font-sans text-xs text-text-tertiary">
                          {category.plotType}
                        </span>
                      </TableCell>
                      <TableCell>{category.sizeLabel}</TableCell>
                      <TableCell mono>{formatPKR(listPrice)}</TableCell>
                      <TableCell>
                        <StatusBadge
                          variant={
                            category.availableUnits > 0 ? "success" : "warning"
                          }
                        >
                          {category.availableUnits} / {category.totalUnits}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>{category.allocationStrategy}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/society-portal/inventory/${category.id}`}>
                            Edit
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

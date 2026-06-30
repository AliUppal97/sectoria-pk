import Link from "next/link";
import {
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@sectoria/ui";
import { categoryPath } from "@/lib/marketplace";

interface PaymentPlanView {
  readonly id: string;
  readonly label: string;
  readonly downPaymentPct: string;
  readonly installmentCount: number;
  readonly installmentInterval: string;
}

interface CategoryWithPlans {
  readonly id: string;
  readonly slug: string;
  readonly phase: string;
  readonly block: string;
  readonly plotType: "RESIDENTIAL" | "COMMERCIAL";
  readonly sizeLabel: string;
  readonly sizeSqft: number;
  readonly pricePerSqft: string | number;
  readonly paymentPlans: readonly PaymentPlanView[];
}

function planCellSummary(plan: PaymentPlanView | undefined): string {
  if (plan === undefined) return "—";
  const downPct = Number(plan.downPaymentPct);
  if (plan.installmentCount === 0 || plan.installmentInterval === "lump-sum") {
    return `${downPct}% down · lump sum`;
  }
  return `${downPct}% · ${plan.installmentCount} × ${plan.installmentInterval}`;
}

export function SocietyPaymentPlans({
  citySlug,
  societySlug,
  categories,
}: {
  citySlug: string;
  societySlug: string;
  categories: readonly CategoryWithPlans[];
}) {
  const planLabels = [
    ...new Set(
      categories.flatMap((category) =>
        category.paymentPlans.map((plan) => plan.label),
      ),
    ),
  ].sort();

  if (categories.length === 0) {
    return (
      <EmptyState
        heading="No payment plans listed"
        description="This society has not published inventory categories yet."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border-base">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            {planLabels.map((label) => (
              <TableHead key={label}>{label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => {
            const path = categoryPath(citySlug, societySlug, category.slug);
            const plansByLabel = new Map(
              category.paymentPlans.map((plan) => [plan.label, plan]),
            );
            return (
              <TableRow key={category.id}>
                <TableCell>
                  <Link
                    href={path}
                    className="font-medium text-text-accent hover:underline"
                  >
                    {category.sizeLabel}
                  </Link>
                  <span className="mt-0.5 block font-sans text-xs text-text-tertiary">
                    {category.plotType === "COMMERCIAL"
                      ? "Commercial"
                      : "Residential"}{" "}
                    · {category.phase} · {category.block}
                  </span>
                </TableCell>
                {planLabels.map((label) => (
                  <TableCell key={label} className="font-sans text-sm">
                    {category.paymentPlans.length === 0
                      ? "On request"
                      : planCellSummary(plansByLabel.get(label))}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

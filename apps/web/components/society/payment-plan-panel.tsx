"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  FieldError,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@sectoria/ui";
import { InstallmentInterval } from "@sectoria/types";
import { api } from "@/lib/trpc/react";

interface PaymentPlanRow {
  readonly id: string;
  readonly label: string;
  readonly downPaymentPct: string;
  readonly installmentCount: number;
  readonly installmentInterval: string;
}

export function PaymentPlanPanel({
  categoryId,
  plans,
}: {
  categoryId: string;
  plans: readonly PaymentPlanRow[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [downPaymentPct, setDownPaymentPct] = useState("25");
  const [installmentCount, setInstallmentCount] = useState("24");
  const [installmentInterval, setInstallmentInterval] = useState<string>(
    InstallmentInterval.MONTHLY,
  );
  const [error, setError] = useState<string | null>(null);

  const createMutation = api.inventoryCategory.createPaymentPlan.useMutation({
    onSuccess: () => {
      setLabel("");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });
  const deleteMutation = api.inventoryCategory.deletePaymentPlan.useMutation({
    onSuccess: () => router.refresh(),
    onError: (err) => setError(err.message),
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    createMutation.mutate({
      categoryId,
      label,
      downPaymentPct,
      installmentCount: Number(installmentCount),
      installmentInterval: installmentInterval as typeof InstallmentInterval[keyof typeof InstallmentInterval],
    });
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-xl border border-border-base">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Down %</TableHead>
              <TableHead>Instalments</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-text-tertiary">
                  No payment plans yet.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>{plan.label}</TableCell>
                  <TableCell className="font-mono">{plan.downPaymentPct}%</TableCell>
                  <TableCell>
                    {plan.installmentCount > 0
                      ? `${plan.installmentCount} × ${plan.installmentInterval}`
                      : "Lump sum"}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deleteMutation.isPending}
                      onClick={() =>
                        deleteMutation.mutate({ paymentPlanId: plan.id })
                      }
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="plan-label">Plan label</Label>
          <Input
            id="plan-label"
            className="mt-1.5"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="3-Year Installments"
            required
          />
        </div>
        <div>
          <Label htmlFor="plan-down">Down payment %</Label>
          <Input
            id="plan-down"
            className="mt-1.5 font-mono"
            value={downPaymentPct}
            onChange={(e) => setDownPaymentPct(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="plan-count">Instalment count (0 = lump sum)</Label>
          <Input
            id="plan-count"
            type="number"
            min={0}
            className="mt-1.5 font-mono"
            value={installmentCount}
            onChange={(e) => setInstallmentCount(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="plan-interval">Interval</Label>
          <Select
            value={installmentInterval}
            onValueChange={setInstallmentInterval}
          >
            <SelectTrigger id="plan-interval" className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={InstallmentInterval.LUMP_SUM}>
                Lump sum
              </SelectItem>
              <SelectItem value={InstallmentInterval.MONTHLY}>Monthly</SelectItem>
              <SelectItem value={InstallmentInterval.QUARTERLY}>
                Quarterly
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {error ? (
          <div className="sm:col-span-2">
            <FieldError>{error}</FieldError>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Adding…" : "Add payment plan"}
          </Button>
        </div>
      </form>
    </div>
  );
}

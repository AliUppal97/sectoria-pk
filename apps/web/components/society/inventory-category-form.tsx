"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AllocationStrategy,
  PlotType,
  type AllocationStrategy as AllocationStrategyType,
  type PlotType as PlotTypeType,
} from "@sectoria/types";
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
} from "@sectoria/ui";
import { api } from "@/lib/trpc/react";

interface CategoryFormValues {
  slug: string;
  phase: string;
  block: string;
  plotType: PlotTypeType;
  sizeLabel: string;
  sizeSqft: number;
  pricePerSqft: string;
  totalUnits: number;
  allocationStrategy: AllocationStrategyType;
  fbrValuationZone: string;
}

interface InventoryCategoryFormProps {
  societyId: string;
  mode: "create" | "edit";
  categoryId?: string;
  initial?: Partial<CategoryFormValues>;
}

/** Create or edit an inventory category for the authenticated society. */
export function InventoryCategoryForm({
  societyId,
  mode,
  categoryId,
  initial,
}: InventoryCategoryFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<CategoryFormValues>({
    slug: initial?.slug ?? "",
    phase: initial?.phase ?? "",
    block: initial?.block ?? "",
    plotType: initial?.plotType ?? PlotType.RESIDENTIAL,
    sizeLabel: initial?.sizeLabel ?? "",
    sizeSqft: initial?.sizeSqft ?? 1361,
    pricePerSqft: initial?.pricePerSqft ?? "25000",
    totalUnits: initial?.totalUnits ?? 40,
    allocationStrategy:
      initial?.allocationStrategy ?? AllocationStrategy.FIFO,
    fbrValuationZone: initial?.fbrValuationZone ?? "LDA-LHR-Z1",
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = api.inventoryCategory.create.useMutation({
    onSuccess: () => router.push("/society-portal/inventory"),
    onError: (err) => setError(err.message),
  });

  const updateMutation = api.inventoryCategory.update.useMutation({
    onSuccess: () => router.push("/society-portal/inventory"),
    onError: (err) => setError(err.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "create") {
      createMutation.mutate({ societyId, ...values });
      return;
    }
    if (categoryId === undefined) {
      setError("Category id is missing.");
      return;
    }
    updateMutation.mutate({
      categoryId,
      data: {
        pricePerSqft: values.pricePerSqft,
        totalUnits: values.totalUnits,
        allocationStrategy: values.allocationStrategy,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      {mode === "create" ? (
        <>
          <FieldGroup label="Phase" htmlFor="phase">
            <Input
              id="phase"
              value={values.phase}
              onChange={(e) =>
                setValues((v) => ({ ...v, phase: e.target.value }))
              }
              required
            />
          </FieldGroup>
          <FieldGroup label="Block" htmlFor="block">
            <Input
              id="block"
              value={values.block}
              onChange={(e) =>
                setValues((v) => ({ ...v, block: e.target.value }))
              }
              required
            />
          </FieldGroup>
          <FieldGroup label="Size label" htmlFor="sizeLabel">
            <Input
              id="sizeLabel"
              value={values.sizeLabel}
              onChange={(e) =>
                setValues((v) => ({ ...v, sizeLabel: e.target.value }))
              }
              required
            />
          </FieldGroup>
          <FieldGroup label="Size (sq ft)" htmlFor="sizeSqft">
            <Input
              id="sizeSqft"
              type="number"
              min={1}
              value={values.sizeSqft}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  sizeSqft: Number(e.target.value),
                }))
              }
              required
            />
          </FieldGroup>
          <FieldGroup label="URL slug" htmlFor="slug">
            <Input
              id="slug"
              value={values.slug}
              onChange={(e) =>
                setValues((v) => ({ ...v, slug: e.target.value }))
              }
              required
            />
          </FieldGroup>
          <FieldGroup label="Plot type" htmlFor="plotType">
            <Select
              value={values.plotType}
              onValueChange={(plotType) =>
                setValues((v) => ({
                  ...v,
                  plotType: plotType as PlotTypeType,
                }))
              }
            >
              <SelectTrigger id="plotType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PlotType.RESIDENTIAL}>Residential</SelectItem>
                <SelectItem value={PlotType.COMMERCIAL}>Commercial</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="FBR valuation zone" htmlFor="fbrZone">
            <Input
              id="fbrZone"
              value={values.fbrValuationZone}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  fbrValuationZone: e.target.value,
                }))
              }
              required
            />
          </FieldGroup>
        </>
      ) : null}

      <FieldGroup label="Price per sq ft (PKR)" htmlFor="pricePerSqft">
        <Input
          id="pricePerSqft"
          value={values.pricePerSqft}
          onChange={(e) =>
            setValues((v) => ({ ...v, pricePerSqft: e.target.value }))
          }
          required
        />
      </FieldGroup>
      <FieldGroup label="Total units" htmlFor="totalUnits">
        <Input
          id="totalUnits"
          type="number"
          min={0}
          value={values.totalUnits}
          onChange={(e) =>
            setValues((v) => ({
              ...v,
              totalUnits: Number(e.target.value),
            }))
          }
          required
        />
      </FieldGroup>
      <FieldGroup label="Allocation strategy" htmlFor="allocation">
        <Select
          value={values.allocationStrategy}
          onValueChange={(strategy) =>
            setValues((v) => ({
              ...v,
              allocationStrategy: strategy as AllocationStrategyType,
            }))
          }
        >
          <SelectTrigger id="allocation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AllocationStrategy.FIFO}>FIFO</SelectItem>
            <SelectItem value={AllocationStrategy.BALLOT}>Ballot</SelectItem>
          </SelectContent>
        </Select>
      </FieldGroup>

      {error ? <FieldError>{error}</FieldError> : null}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : mode === "create" ? "Create category" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/society-portal/inventory")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function FieldGroup({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

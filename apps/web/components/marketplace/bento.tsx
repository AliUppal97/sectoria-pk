import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@sectoria/ui";

/**
 * Bento grid primitives (design spec §4.1). A bento section ranks content by
 * cell size: one 2×2 anchor maximum, with wide/tall/unit cells filling around
 * it. The grid is 1-col on mobile, 2-col on tablet, 4-col on desktop; the 16px
 * gutter is half the 24px inner cell padding, exactly as the spec mandates.
 *
 * Used for the homepage feature sections and the society comparison layout.
 */
export function BentoGrid({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
      {...props}
    />
  );
}

const bentoCellVariants = cva(
  cn(
    "relative overflow-hidden rounded-2xl border border-border-base bg-surface-card p-6",
    "transition-colors duration-200 ease-default",
  ),
  {
    variants: {
      size: {
        // Cell importance = cell size (design spec §4.1). Only one anchor per grid.
        anchor: "sm:col-span-2 sm:row-span-2",
        wide: "sm:col-span-2",
        tall: "lg:row-span-2",
        unit: "",
      },
      tone: {
        plain: "",
        // Dark anchor for the hero feature — navy surface, inverse text.
        navy: "border-brand-navy-light bg-brand-navy text-text-inverse",
        accent: "border-success-border bg-success-bg",
      },
    },
    defaultVariants: { size: "unit", tone: "plain" },
  },
);

export interface BentoCellProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bentoCellVariants> {}

export function BentoCell({
  className,
  size,
  tone,
  ...props
}: BentoCellProps) {
  return (
    <div
      className={cn(bentoCellVariants({ size, tone }), className)}
      {...props}
    />
  );
}

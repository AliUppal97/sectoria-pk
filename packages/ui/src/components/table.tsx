import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { cn } from "../lib/utils";

/**
 * Data table primitives per design spec §5.8. The container is a white
 * card with a 12px radius and no padding (the table fills it). Header is a
 * subtle-tinted, uppercase, tertiary-text row; body rows have a 1px base
 * border that drops on the last row and a subtle hover.
 */
export const Table = forwardRef<
  HTMLTableElement,
  HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="w-full overflow-x-auto rounded-lg border border-border-base bg-surface-card">
    <table
      ref={ref}
      className={cn("w-full border-collapse text-left", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("bg-surface-subtle", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn(className)} {...props} />
));
TableBody.displayName = "TableBody";

export const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border-base last:border-0 hover:bg-surface-subtle",
      "transition-colors duration-150 ease-default",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  // 8px/12px padding, Inter 600 11px uppercase tracking 0.05em, tertiary.
  <th
    ref={ref}
    className={cn(
      "border-b-2 border-border-strong px-3 py-2",
      "font-sans text-2xs font-semibold uppercase tracking-[0.05em] text-text-tertiary",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Render the cell value in the monospace face (CNIC, PKR, serials). */
  mono?: boolean;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, mono, ...props }, ref) => (
    // 11px/12px padding (2.75/3 on the 4px scale) — design spec §5.8.
    <td
      ref={ref}
      className={cn(
        "px-3 py-2.75 align-middle font-sans text-sm text-text-primary",
        mono && "font-mono text-xs text-text-secondary",
        className,
      )}
      {...props}
    />
  ),
);
TableCell.displayName = "TableCell";

export const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("p-3 font-sans text-xs text-text-tertiary", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

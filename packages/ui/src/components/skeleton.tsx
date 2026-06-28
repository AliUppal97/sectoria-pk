import type { HTMLAttributes } from "react";
import { cn } from "../lib/utils";

/**
 * A content-shaped loading placeholder per design spec §5.10. Renders a
 * left-to-right shimmer (surface-subtle → surface-inset → surface-subtle,
 * 1.5s) and is `aria-hidden` so screen readers announce the live region
 * around it, not the placeholder shapes.
 *
 * Size it to match the content it replaces — a 3-card grid loads as 3
 * skeleton cards of the same size, never a lone spinner.
 *
 * @example
 * <Skeleton className="h-4 w-32" />
 */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-shimmer rounded-md bg-gradient-to-r from-surface-subtle via-surface-inset to-surface-subtle bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}

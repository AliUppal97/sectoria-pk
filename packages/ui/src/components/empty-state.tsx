import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export interface EmptyStateProps {
  /** A simple line icon (defaults to an inbox). Rendered at 48px, disabled tint. */
  icon?: LucideIcon;
  /**
   * What is specifically missing — never "No results". Be concrete, e.g.
   * "No societies match your filters" (design spec §5.9).
   */
  heading: string;
  /** Optional supporting sentence. */
  description?: ReactNode;
  /** The action out of the empty state — a button or link. Required by §10. */
  action?: ReactNode;
  className?: string;
}

/**
 * Empty state per design spec §5.9 — illustration + specific heading + CTA.
 * All three are present by contract: the `action` is the way out, and the
 * `heading` must describe what is absent rather than a generic "No results".
 */
export function EmptyState({
  icon: Icon = Inbox,
  heading,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className="h-12 w-12 text-text-disabled"
        strokeWidth={1.5}
      />
      <h3 className="font-sans text-md font-semibold text-text-primary">
        {heading}
      </h3>
      {description ? (
        <p className="max-w-sm font-sans text-sm text-text-secondary">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

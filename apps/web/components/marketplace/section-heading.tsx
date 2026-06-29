import type { ReactNode } from "react";
import { cn } from "@sectoria/ui";

/**
 * Consistent section header for marketplace pages — an eyebrow label, a title,
 * and an optional supporting line, with an optional trailing action (e.g. a
 * "view all" link). Keeps vertical rhythm and type scale uniform across pages.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        {eyebrow ? (
          <span className="font-sans text-2xs font-semibold uppercase tracking-[0.08em] text-text-accent">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="font-sans text-2xl font-bold leading-tight text-text-primary">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl font-sans text-sm text-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

import type { ReactNode } from "react";

/**
 * Portal page header — a page title, optional supporting line, and an optional
 * action slot (e.g. a primary CTA). Keeps vertical rhythm consistent across the
 * buyer portal pages.
 */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-sans text-xl font-bold text-text-primary">{title}</h1>
        {description ? (
          <p className="mt-1 font-sans text-sm text-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "../lib/utils";

export interface ErrorStateProps {
  /** Short, human-readable summary of what went wrong. */
  title?: string;
  /**
   * Plain-language explanation + what the user can do — never a raw error
   * code or stack trace (UX rule: error states are human-readable).
   */
  message: ReactNode;
  /** Recovery action handler — renders a "Try again" button when provided. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Support link target — every error state offers a path forward. */
  supportHref?: string;
  className?: string;
}

/**
 * Error state per the UX five-states rule: a human-readable message, a
 * recovery action, and a support link. Use this instead of leaving a
 * failed fetch as a blank or broken region.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  supportHref,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <AlertTriangle
        aria-hidden="true"
        className="h-12 w-12 text-danger"
        strokeWidth={1.5}
      />
      <h3 className="font-sans text-md font-semibold text-text-primary">
        {title}
      </h3>
      <p className="max-w-sm font-sans text-sm text-text-secondary">{message}</p>
      <div className="mt-2 flex items-center gap-3">
        {onRetry ? (
          <Button variant="primary" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
        {supportHref ? (
          <Button asChild variant="ghost" size="sm">
            <a href={supportHref}>Contact support</a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

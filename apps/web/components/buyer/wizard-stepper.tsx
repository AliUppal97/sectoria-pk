"use client";

import { Check } from "lucide-react";
import { cn } from "@sectoria/ui";

export interface WizardStep {
  readonly id: number;
  readonly label: string;
}

/**
 * Booking-wizard progress indicator (design spec §6 / UX rule: a multi-step
 * flow always shows where you are and how far is left). Completed steps show a
 * check and are navigable back to; the current step is highlighted; future
 * steps are inert until reached.
 */
export function WizardStepper({
  steps,
  current,
  maxReached,
  onStepSelect,
}: {
  steps: readonly WizardStep[];
  current: number;
  maxReached: number;
  onStepSelect: (step: number) => void;
}) {
  return (
    <nav aria-label="Booking progress">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isDone = step.id < current;
          const isCurrent = step.id === current;
          const isReachable = step.id <= maxReached;
          const isLast = index === steps.length - 1;
          return (
            <li
              key={step.id}
              className={cn("flex items-center", !isLast && "flex-1")}
            >
              <button
                type="button"
                onClick={() => isReachable && onStepSelect(step.id)}
                disabled={!isReachable}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "group flex items-center gap-2 rounded-md outline-none",
                  "focus-visible:ring-2 focus-visible:ring-brand-navy-light focus-visible:ring-offset-2",
                  isReachable ? "cursor-pointer" : "cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-sans text-xs font-semibold",
                    "transition-colors duration-150 ease-default",
                    isDone && "bg-brand-accent text-text-inverse",
                    isCurrent && "bg-brand-navy text-text-inverse",
                    !isDone &&
                      !isCurrent &&
                      "border-2 border-border-strong bg-surface-card text-text-tertiary",
                  )}
                >
                  {isDone ? (
                    <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    step.id
                  )}
                </span>
                <span
                  className={cn(
                    "hidden font-sans text-xs font-medium sm:inline",
                    isCurrent
                      ? "text-text-primary"
                      : isDone
                        ? "text-text-secondary"
                        : "text-text-tertiary",
                  )}
                >
                  {step.label}
                </span>
              </button>
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-2 h-0.5 flex-1 rounded-full",
                    step.id < current ? "bg-brand-accent" : "bg-border-base",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

import { Check } from "lucide-react";
import { EscrowState, type EscrowState as EscrowStateType } from "@sectoria/types";
import { cn } from "@sectoria/ui";
import {
  ESCROW_DESCRIPTION,
  ESCROW_HAPPY_PATH,
  ESCROW_LABEL,
} from "@/lib/escrow-display";

type StepStatus = "done" | "active" | "todo";

/**
 * Vertical escrow timeline for a booking (design spec §8.4 adapted to a
 * vertical layout): done steps show an emerald check, the active step a filled
 * navy node, and upcoming steps a grey outline — so a buyer can see exactly
 * where their escrow-backed booking sits on the happy path.
 *
 * A cancelled booking is shown as a terminal cancelled node beneath the token
 * step, since cancellation leaves the happy path.
 */
export function EscrowTimeline({
  currentState,
}: {
  currentState: EscrowStateType;
}) {
  const isCancelled = currentState === EscrowState.CANCELLED;
  const currentIndex = ESCROW_HAPPY_PATH.indexOf(currentState);

  return (
    <ol className="flex flex-col">
      {ESCROW_HAPPY_PATH.map((state, index) => {
        const status: StepStatus = isCancelled
          ? index === 0
            ? "done"
            : "todo"
          : index < currentIndex
            ? "done"
            : index === currentIndex
              ? "active"
              : "todo";
        const isLast = index === ESCROW_HAPPY_PATH.length - 1;
        return (
          <li key={state} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Node status={status} />
              {!isLast ? (
                <span
                  className={cn(
                    "w-0.5 flex-1",
                    status === "done" ? "bg-brand-accent" : "bg-border-base",
                  )}
                />
              ) : null}
            </div>
            <div className={cn("pb-6", isLast && "pb-0")}>
              <p
                className={cn(
                  "font-sans text-sm font-semibold",
                  status === "active"
                    ? "text-brand-navy"
                    : status === "done"
                      ? "text-text-primary"
                      : "text-text-tertiary",
                )}
              >
                {ESCROW_LABEL[state]}
              </p>
              <p className="mt-0.5 font-sans text-xs text-text-tertiary">
                {ESCROW_DESCRIPTION[state]}
              </p>
            </div>
          </li>
        );
      })}

      {isCancelled ? (
        <li className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-border-strong bg-surface-subtle" />
          </div>
          <div>
            <p className="font-sans text-sm font-semibold text-text-secondary">
              {ESCROW_LABEL[EscrowState.CANCELLED]}
            </p>
            <p className="mt-0.5 font-sans text-xs text-text-tertiary">
              {ESCROW_DESCRIPTION[EscrowState.CANCELLED]}
            </p>
          </div>
        </li>
      ) : null}
    </ol>
  );
}

function Node({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent text-text-inverse">
        <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-navy">
        <span className="h-2 w-2 rounded-full bg-text-inverse" />
      </span>
    );
  }
  return (
    <span className="h-6 w-6 rounded-full border-2 border-border-strong bg-surface-card" />
  );
}

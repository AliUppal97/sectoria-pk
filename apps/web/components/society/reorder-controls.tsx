"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@sectoria/ui";

/** Move-up / move-down controls for ordered society content lists. */
export function ReorderControls({
  index,
  total,
  disabled,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  total: number;
  disabled?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || index === 0}
        aria-label="Move up"
        onClick={onMoveUp}
      >
        <ChevronUp aria-hidden="true" className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || index === total - 1}
        aria-label="Move down"
        onClick={onMoveDown}
      >
        <ChevronDown aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Returns a new array with the item at `index` swapped with its neighbour. */
export function swapOrderedIds(
  ids: readonly string[],
  index: number,
  direction: "up" | "down",
): string[] {
  const next = [...ids];
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= next.length) return next;
  const current = next[index];
  const neighbour = next[target];
  if (current === undefined || neighbour === undefined) return next;
  next[index] = neighbour;
  next[target] = current;
  return next;
}

import { Star } from "lucide-react";
import { cn } from "@sectoria/ui";

/**
 * Compact aggregate-rating display: filled stars + the numeric average + review
 * count. Colour is never the only signal (design spec §9) — the number and
 * count are always shown, and the whole control carries an accessible label.
 */
export function RatingStars({
  rating,
  count,
  className,
}: {
  rating: number;
  count: number;
  className?: string;
}) {
  const rounded = Math.round(rating);
  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      aria-label={`Rated ${rating.toFixed(1)} out of 5 from ${count} ${count === 1 ? "review" : "reviews"}`}
    >
      <div className="flex" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            className={cn(
              "h-3.5 w-3.5",
              index < rounded
                ? "fill-warning text-warning"
                : "text-border-strong",
            )}
            strokeWidth={1.75}
          />
        ))}
      </div>
      <span className="font-mono text-xs font-semibold text-text-primary">
        {rating.toFixed(1)}
      </span>
      <span className="font-sans text-xs text-text-tertiary">({count})</span>
    </div>
  );
}

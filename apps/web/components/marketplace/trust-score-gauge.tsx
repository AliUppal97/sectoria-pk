import { cn } from "@sectoria/ui";

/**
 * Compliance / trust-score gauge (design spec §8.5): a 110px SVG ring whose arc
 * length encodes the 0–100 score and whose colour bands it (≥80 success, 50–79
 * warning, <50 danger). Rendered server-side as a static arc; the score is
 * always shown as text too, so colour is never the only signal (design spec §9).
 */
const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreStroke(score: number): string {
  if (score >= 80) return "stroke-success";
  if (score >= 50) return "stroke-warning";
  return "stroke-danger";
}

export function TrustScoreGauge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div
      className={cn("relative h-[110px] w-[110px]", className)}
      role="img"
      aria-label={`Trust score ${clamped} out of 100`}
    >
      <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
        <circle
          cx="55"
          cy="55"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          className="stroke-border-base"
        />
        <circle
          cx="55"
          cy="55"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={scoreStroke(clamped)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-sans text-xl font-extrabold leading-none text-text-primary">
          {clamped}
        </span>
        <span className="font-sans text-3xs text-text-tertiary">/100</span>
      </div>
    </div>
  );
}

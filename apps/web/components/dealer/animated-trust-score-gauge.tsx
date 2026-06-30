"use client";

import { useEffect, useState } from "react";
import { cn } from "@sectoria/ui";

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const FILL_DURATION_MS = 800;

function scoreStroke(score: number): string {
  if (score >= 80) return "stroke-success";
  if (score >= 50) return "stroke-warning";
  return "stroke-danger";
}

/**
 * Trust-score gauge with an animated SVG arc fill (design spec §7.2 — 800ms
 * ease-out). Respects `prefers-reduced-motion` by jumping to the final value.
 */
export function AnimatedTrustScoreGauge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const target = Math.max(0, Math.min(100, Math.round(score)));
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const frame = requestAnimationFrame(() => setDisplayScore(target));
      return () => cancelAnimationFrame(frame);
    }

    const start = performance.now();
    let frame = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / FILL_DURATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(target * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  const offset = CIRCUMFERENCE * (1 - displayScore / 100);

  return (
    <div
      className={cn("relative h-[110px] w-[110px]", className)}
      role="img"
      aria-label={`Trust score ${target} out of 100`}
      aria-live="polite"
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
          className={cn(scoreStroke(target), "transition-[stroke-dashoffset] duration-75 ease-out")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-sans text-xl font-extrabold leading-none text-text-primary">
          {displayScore}
        </span>
        <span className="font-sans text-3xs text-text-tertiary">/100</span>
      </div>
    </div>
  );
}

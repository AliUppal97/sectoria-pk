"use client";

import { useEffect, useState } from "react";
import type { TrustScoreResult } from "@sectoria/types";
import { ProgressBar } from "@sectoria/ui";
import { TRUST_SCORE_COMPONENT_LABEL } from "@/lib/dealer/trust-score-labels";
import { AnimatedTrustScoreGauge } from "./animated-trust-score-gauge";

/**
 * Trust-score breakdown with animated gauge and staggered progress bars
 * (design spec §7.2 — gauge fill 800ms, progress bar 500ms).
 */
export function TrustScoreBreakdown({
  trustScore,
  className,
}: {
  trustScore: TrustScoreResult;
  className?: string;
}) {
  const [visibleBars, setVisibleBars] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const frame = requestAnimationFrame(() =>
        setVisibleBars(trustScore.breakdown.length),
      );
      return () => cancelAnimationFrame(frame);
    }

    let count = 0;
    const interval = window.setInterval(() => {
      count += 1;
      setVisibleBars(count);
      if (count >= trustScore.breakdown.length) {
        window.clearInterval(interval);
      }
    }, 50);

    return () => window.clearInterval(interval);
  }, [trustScore.breakdown.length]);

  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <AnimatedTrustScoreGauge score={trustScore.score} />
        <div className="text-center sm:text-left">
          <h2 className="font-sans text-lg font-bold text-text-primary">
            Your trust score
          </h2>
          <p className="mt-1 max-w-md font-sans text-sm text-text-secondary">
            Weighted heavily toward PLRA-verified completed transactions — a
            profile with zero transfers cannot score above 50 regardless of other
            signals.
          </p>
        </div>
      </div>

      <ul className="mt-8 flex flex-col gap-4" aria-live="polite">
        {trustScore.breakdown.map((component, index) => (
          <li
            key={component.component}
            className={
              index < visibleBars
                ? "opacity-100 transition-opacity duration-200"
                : "opacity-0"
            }
          >
            <ProgressBar
              value={component.normalizedValue * 100}
              label={`${TRUST_SCORE_COMPONENT_LABEL[component.component] ?? component.component} · ${component.weight}% weight · contributes ${Math.round(component.contribution)} pts`}
              showValue
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

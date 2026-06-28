import { cn } from "../lib/utils";

export interface ProgressBarProps {
  /** Current value, 0–100. Clamped to that range. */
  value: number;
  /** Accessible label describing what is progressing. */
  label?: string;
  /** Show the numeric percentage next to the label. */
  showValue?: boolean;
  className?: string;
}

/**
 * A horizontal progress indicator (design spec §7.2 — width animates over
 * 500ms). Exposes `role="progressbar"` with the ARIA value attributes so
 * assistive tech announces progress. The fill uses the emerald accent
 * (completion/positive movement).
 */
export function ProgressBar({
  value,
  label,
  showValue = false,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label || showValue ? (
        <div className="flex items-center justify-between font-sans text-xs text-text-secondary">
          {label ? <span>{label}</span> : <span />}
          {showValue ? (
            <span className="font-mono text-text-tertiary">{clamped}%</span>
          ) : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-inset"
      >
        <div
          className="h-full rounded-full bg-brand-accent transition-[width] duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

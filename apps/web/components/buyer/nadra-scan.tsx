"use client";

import { Fingerprint, ScanLine } from "lucide-react";

/**
 * NADRA identity-scan animation (design spec §7.2) — the deliberate, branded
 * "verifying against NADRA" state shown while the CNIC check is in flight.
 * A thin emerald bar sweeps top→bottom over a stylised CNIC surface; this is
 * intentionally NOT a generic spinner. Respects prefers-reduced-motion via the
 * global rule in `theme.css` (the sweep falls back to a near-static bar).
 */
export function NadraScan() {
  return (
    <div
      role="status"
      aria-label="Verifying your CNIC against NADRA records"
      className="relative mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-brand-navy-light bg-brand-navy p-6 text-text-inverse"
    >
      {/* Stylised CNIC surface being scanned. */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fingerprint aria-hidden="true" className="h-5 w-5 text-brand-accent" />
          <span className="font-sans text-2xs font-semibold uppercase tracking-[0.08em] text-text-inverse/70">
            NADRA
          </span>
        </div>
        <ScanLine aria-hidden="true" className="h-4 w-4 text-text-inverse/40" />
      </div>

      <div className="mt-5 space-y-2">
        <div className="h-2.5 w-2/3 rounded-full bg-text-inverse/15" />
        <div className="h-2.5 w-1/2 rounded-full bg-text-inverse/10" />
        <div className="h-2.5 w-3/4 rounded-full bg-text-inverse/10" />
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-brand-accent" />
        <span className="font-sans text-xs text-text-inverse/70">
          Matching biometric record…
        </span>
      </div>

      {/* The sweeping scan bar. Absolutely positioned; animates its `top`. */}
      <span
        aria-hidden="true"
        className="animate-scan-bar pointer-events-none absolute inset-x-0 h-0.5 bg-brand-accent shadow-[0_0_12px_2px_var(--color-brand-accent)]"
      />
    </div>
  );
}

import type { NadraVerificationResult } from "@sectoria/types";
import { formatDate } from "../lib/format-date";
import { maskCnic } from "../lib/mask-cnic";
import { Card } from "./card";
import { StatusBadge, TrustBadge } from "./badge";
import { Skeleton } from "./skeleton";
import { cn } from "../lib/utils";

export interface IdentityCardProps {
  /** The NADRA verification result to display. */
  result: NadraVerificationResult;
  /**
   * Reveal the full CNIC. Defaults to `false` — full CNICs are only shown
   * in explicitly authorized admin/verification views (security.mdc). Every
   * other surface gets the masked form.
   */
  revealCnic?: boolean;
  className?: string;
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-sans text-2xs uppercase tracking-[0.06em] text-text-tertiary">
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm text-text-primary",
          mono ? "font-mono tracking-[0.05em]" : "font-sans font-medium",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Post-verification identity display (the file structure's "identity-card").
 * Shows the NADRA result with a verified/unverified status, the (masked by
 * default) CNIC in the monospace face, and supporting identity fields.
 *
 * Display-only: it presents a `NadraVerificationResult`; it never calls the
 * NADRA adapter (that lives behind `@sectoria/api-client`).
 */
export function IdentityCard({
  result,
  revealCnic = false,
  className,
}: IdentityCardProps) {
  const cnicDisplay = revealCnic ? result.cnic : maskCnic(result.cnic);
  const confidencePct = Math.round(result.biometricConfidence * 100);

  return (
    <Card className={cn("p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <TrustBadge variant="nadra" />
        {result.verified ? (
          <StatusBadge variant="success">Verified</StatusBadge>
        ) : (
          <StatusBadge variant="danger">Not verified</StatusBadge>
        )}
      </div>

      <p className="mb-4 font-sans text-lg font-bold text-text-primary">
        {result.fullName ?? "Name unavailable"}
      </p>

      <dl className="grid grid-cols-2 gap-4">
        <Field label="CNIC" value={cnicDisplay} mono />
        <Field label="Father's name" value={result.fatherName ?? "—"} />
        <Field
          label="Date of birth"
          value={result.dateOfBirth ? formatDate(result.dateOfBirth) : "—"}
        />
        <Field label="Biometric match" value={`${confidencePct}%`} mono />
        <Field label="Verified on" value={formatDate(result.verifiedAt)} />
      </dl>
    </Card>
  );
}

/** Content-shaped loading placeholder matching {@link IdentityCard}. */
export function IdentityCardSkeleton({ className }: { className?: string }) {
  return (
    <Card aria-busy="true" aria-live="polite" className={cn("p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="mb-4 h-6 w-48" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </Card>
  );
}

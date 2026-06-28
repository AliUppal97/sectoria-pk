import type { PlraCertificate } from "@sectoria/types";
import { QrCode, ShieldCheck } from "lucide-react";
import { formatDate } from "../lib/format-date";
import { Skeleton } from "./skeleton";
import { cn } from "../lib/utils";

/** A label/value pair shown in the certificate's glass data grid. */
export interface CertificateDetail {
  label: string;
  value: string;
}

export interface CertificateCardProps {
  /** The issued certificate (number, issue date, document URL). */
  certificate: PlraCertificate;
  /** Heading shown beside the PLRA badge. */
  title?: string;
  subtitle?: string;
  /** Detail rows for the 2-column glass grid (society, plot, owner, etc.). */
  details?: CertificateDetail[];
  className?: string;
}

/**
 * The PLRA property certificate — the single sanctioned glassmorphism
 * moment in the product (design spec §5.5). A navy gradient panel with
 * glass-card detail cells, a verified badge, and the certificate number in
 * the monospace face. Enters with the stamp animation (§7.2).
 *
 * Display-only: it renders an already-issued `PlraCertificate`. Issuance
 * happens via the PLRA adapter behind `@sectoria/api-client`.
 */
export function CertificateCard({
  certificate,
  title = "Property Transfer Certificate",
  subtitle = "Punjab Land Record Authority",
  details = [],
  className,
}: CertificateCardProps) {
  return (
    <div
      className={cn(
        "animate-stamp relative overflow-hidden rounded-xl bg-gradient-to-br from-cert-from to-cert-to p-7 text-text-inverse",
        className,
      )}
    >
      {/* Decorative circle — 200×200 (h-50/w-50 = 200px), bled off the corner. */}
      <div
        aria-hidden="true"
        className="absolute -right-10 -top-10 h-50 w-50 rounded-full bg-text-inverse/5"
      />

      <div className="relative">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-accent px-2.5 py-1 font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-inverse">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
              PLRA Verified
            </span>
            <h3 className="mt-3 font-sans text-xl font-bold">{title}</h3>
            <p className="font-sans text-sm text-text-inverse/45">{subtitle}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2">
          <GlassCell
            label="Certificate No."
            value={certificate.certificateNumber}
            mono
          />
          <GlassCell label="Issued" value={formatDate(certificate.issuedAt)} />
          {details.map((detail) => (
            <GlassCell
              key={detail.label}
              label={detail.label}
              value={detail.value}
            />
          ))}
        </dl>

        <div className="mt-5 flex items-end justify-between gap-4">
          <p className="max-w-xs font-sans text-3xs text-text-inverse/45">
            Scan to verify this certificate against the PLRA live record at
            plra.punjab.gov.pk
          </p>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-surface-card">
            <QrCode aria-hidden="true" className="h-12 w-12 text-brand-navy" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassCell({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-text-inverse/10 bg-cert-glass px-3 py-2.5">
      <dt className="font-sans text-3xs uppercase tracking-[0.06em] text-text-inverse/45">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 text-sm font-semibold text-text-inverse",
          mono ? "font-mono tracking-[0.05em]" : "font-sans",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Content-shaped loading placeholder matching {@link CertificateCard}. */
export function CertificateCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-br from-cert-from to-cert-to p-7",
        className,
      )}
    >
      <Skeleton className="h-5 w-28 opacity-30" />
      <Skeleton className="mt-3 h-6 w-56 opacity-30" />
      <div className="mt-5 grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full opacity-30" />
        ))}
      </div>
    </div>
  );
}

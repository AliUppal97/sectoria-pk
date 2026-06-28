import { cva, type VariantProps } from "class-variance-authority";
import {
  Fingerprint,
  Lock,
  ShieldCheck,
  BadgeCheck,
  FileCheck2,
  type LucideIcon,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

/**
 * Status & verification badges — the most-used element in the product
 * (design spec §5.3). Every badge is a pill with three signals together:
 * a colored dot, colored text, and a tinted background. Color alone is
 * never sufficient (design spec §9 — accessibility), so the dot + text
 * are always present.
 */
const statusBadgeVariants = cva(
  cn(
    // pill, 3px/10px padding (0.75/2.5 on the 4px scale), Inter 600 11px
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.75",
    "font-sans text-2xs font-semibold tracking-[0.02em]",
    "animate-pill-in",
  ),
  {
    variants: {
      variant: {
        success: "bg-success-bg text-success-text",
        warning: "bg-warning-bg text-warning-text",
        danger: "bg-danger-bg text-danger-text",
        info: "bg-info-bg text-info-text",
        neutral: "bg-surface-subtle text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

const statusDotColor: Record<
  NonNullable<VariantProps<typeof statusBadgeVariants>["variant"]>,
  string
> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-text-tertiary",
};

export interface StatusBadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children">,
    VariantProps<typeof statusBadgeVariants> {
  children: ReactNode;
  /**
   * Pulse the dot to signal an in-flight/awaiting state. Defaults to `true`
   * for the `warning` variant (PENDING / AWAITING), off otherwise — design
   * spec §5.3.
   */
  pulse?: boolean;
}

export function StatusBadge({
  className,
  variant = "neutral",
  pulse,
  children,
  ...props
}: StatusBadgeProps) {
  const resolvedVariant = variant ?? "neutral";
  const shouldPulse = pulse ?? resolvedVariant === "warning";

  return (
    <span
      role="status"
      className={cn(statusBadgeVariants({ variant }), className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          statusDotColor[resolvedVariant],
          shouldPulse && "animate-pulse-dot",
        )}
      />
      {children}
    </span>
  );
}

/**
 * Heavier "proof" badges for government credentials (design spec §5.3,
 * §8.1). These are solid-colored with an icon + white text — visually
 * distinct from status badges because they assert verified facts, not
 * transient state. Each carries an accessible label explaining what it
 * means (UX rule: a trust badge always explains itself).
 */
const trustBadgeVariants = cva(
  cn(
    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1",
    "font-sans text-2xs font-semibold tracking-[0.02em] text-text-inverse",
  ),
  {
    variants: {
      variant: {
        // Trust hierarchy colors — design spec §8.1.
        plra: "bg-brand-accent",
        nadra: "bg-brand-navy",
        fbrFiler: "bg-success-text",
        escrow: "bg-warning",
        dnfbp: "bg-info",
      },
    },
    defaultVariants: {
      variant: "plra",
    },
  },
);

type TrustVariant = NonNullable<
  VariantProps<typeof trustBadgeVariants>["variant"]
>;

const trustBadgeMeta: Record<
  TrustVariant,
  { icon: LucideIcon; label: string; explanation: string }
> = {
  plra: {
    icon: ShieldCheck,
    label: "PLRA Verified",
    explanation:
      "Ownership confirmed against the Punjab Land Record Authority's live database",
  },
  nadra: {
    icon: Fingerprint,
    label: "NADRA Verified",
    explanation: "Identity confirmed against NADRA's CNIC records",
  },
  fbrFiler: {
    icon: BadgeCheck,
    label: "FBR Active Filer",
    explanation: "Listed on the FBR Active Taxpayer List — lower transfer tax applies",
  },
  escrow: {
    icon: Lock,
    label: "Escrow Protected",
    explanation: "Funds are held in escrow until the transfer completes",
  },
  dnfbp: {
    icon: FileCheck2,
    label: "DNFBP Registered",
    explanation: "Dealer holds a verified DNFBP AML/CFT registration",
  },
};

export interface TrustBadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children">,
    VariantProps<typeof trustBadgeVariants> {
  /** Override the default credential label text. */
  label?: ReactNode;
}

export function TrustBadge({
  className,
  variant = "plra",
  label,
  ...props
}: TrustBadgeProps) {
  const meta = trustBadgeMeta[variant ?? "plra"];
  const Icon = meta.icon;

  return (
    <span
      className={cn(trustBadgeVariants({ variant }), className)}
      title={meta.explanation}
      aria-label={`${meta.label} — ${meta.explanation}`}
      {...props}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.25} />
      {label ?? meta.label}
    </span>
  );
}

export { statusBadgeVariants, trustBadgeVariants, trustBadgeMeta };

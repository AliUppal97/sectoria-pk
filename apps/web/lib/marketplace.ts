import type { VerificationTier } from "@sectoria/database";

/**
 * Marketplace display helpers shared across the public routes. These translate
 * raw domain values (verification tiers, per-sqft Decimal prices) into the
 * labels and figures the UI shows — kept here so a society card, profile page,
 * and comparison table all describe the same value identically.
 */

/** Anything that can stringify to a numeric Decimal (Prisma.Decimal, string). */
export interface DecimalLike {
  toString(): string;
}

/** A money-per-area value as it may arrive: a tRPC DTO string, or a Decimal. */
export type PriceInput = string | number | DecimalLike;

/** Normalises a price value to a JS number for display math (never for storage). */
export function priceToNumber(value: PriceInput): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number(value.toString());
}

/** The minimal category shape needed to derive a starting/total price. */
export interface PricedCategory {
  readonly pricePerSqft: PriceInput;
  readonly sizeSqft: number;
}

/** Total list price for a single category (per-sqft price × area), in rupees. */
export function categoryTotalPrice(category: PricedCategory): number {
  return Math.round(priceToNumber(category.pricePerSqft) * category.sizeSqft);
}

/**
 * The lowest total price across a society's categories — the "starting from"
 * figure on cards and profiles. Returns null when a society has no inventory,
 * so the caller can show an explicit empty/"pricing on request" state.
 */
export function startingPrice(categories: readonly PricedCategory[]): number | null {
  if (categories.length === 0) return null;
  return categories.reduce(
    (min, category) => Math.min(min, categoryTotalPrice(category)),
    Number.POSITIVE_INFINITY,
  );
}

export interface VerificationTierMeta {
  /** StatusBadge variant — semantic colour only (ui-design-system.mdc). */
  readonly variant: "success" | "warning";
  /** Short pill label. */
  readonly label: string;
  /** What the tier actually means — always shown so the badge explains itself. */
  readonly explanation: string;
}

/**
 * Maps a society's verification tier to its badge presentation. A trust signal
 * is never shown bare: each tier carries an explanation (ui-ux-excellence.mdc —
 * verification badges always explain themselves).
 */
export const VERIFICATION_TIER_META: Record<
  VerificationTier,
  VerificationTierMeta
> = {
  PENDING: {
    variant: "warning",
    label: "Verification pending",
    explanation:
      "This society's LOP/NOC approvals are still being confirmed against the development authority.",
  },
  VERIFIED: {
    variant: "success",
    label: "LOP + NOC verified",
    explanation:
      "Layout (LOP) and No-Objection (NOC) approvals confirmed with the development authority.",
  },
  HSMS_LINKED: {
    variant: "success",
    label: "HSMS live-linked",
    explanation:
      "Verified and linked live to the authority's Housing Society Management System for real-time status.",
  },
} as const;

/**
 * A serializable summary of a society for cards and comparison rows. Built on
 * the server (it aggregates categories + reviews); contains only plain values
 * so it can be passed safely into client components (no Decimal/Date).
 */
export interface SocietySummary {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly city: string;
  readonly citySlug: string;
  readonly authority: string;
  readonly verificationTier: VerificationTier;
  readonly hsmsLinked: boolean;
  readonly developmentStage: string;
  readonly developmentPct: number;
  readonly categoryCount: number;
  readonly startingPrice: number | null;
  readonly rating: { readonly value: number; readonly count: number } | null;
}

/** Canonical, SEO-friendly path to a society profile. */
export function societyPath(citySlug: string, societySlug: string): string {
  return `/societies/${citySlug}/${societySlug}`;
}

/** Canonical path to a society's inventory-category detail page. */
export function categoryPath(
  citySlug: string,
  societySlug: string,
  categorySlug: string,
): string {
  return `/societies/${citySlug}/${societySlug}/${categorySlug}`;
}

/** Canonical path to a public dealer profile. */
export function dealerPath(slug: string): string {
  return `/dealers/${slug}`;
}

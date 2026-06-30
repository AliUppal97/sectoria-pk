/**
 * Single source of truth for site-wide constants used in metadata, JSON-LD,
 * sitemaps, and the marketing chrome. Keeping these here (not inlined per page)
 * means the brand name / base URL / tagline change in exactly one place.
 */

/**
 * The canonical public origin, used for `metadataBase`, canonical URLs,
 * sitemap entries, and absolute OG image URLs. Configurable per environment;
 * falls back to localhost for local development.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const SITE = {
  name: "Sectoria",
  legalName: "Sectoria.pk",
  tagline: "Pakistan's verified housing-society marketplace",
  description:
    "Compare verified housing societies across Pakistan, request the best price through Sectoria advisors, and pay your booking token on-platform — without dealing with dealers directly.",
  url: SITE_URL,
  supportEmail: "support@sectoria.pk",
  supportPath: "/support",
} as const;

/** Builds an absolute URL from a site-relative path, for canonicals and OG. */
export function absoluteUrl(pathname: string): string {
  if (pathname.startsWith("http")) return pathname;
  return new URL(pathname, SITE_URL).toString();
}

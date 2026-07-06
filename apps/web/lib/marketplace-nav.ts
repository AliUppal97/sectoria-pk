import { isPublicDealerDirectoryEnabled } from "@/lib/feature-flags";

export interface MarketplaceNavLink {
  readonly href: string;
  readonly label: string;
}

/**
 * Canonical labels for top-level marketplace routes.
 *
 * Header and footer nav use short, parallel nouns (Societies, Compare, Dealers).
 * Hero and in-page CTAs use action copy from {@link MARKETPLACE_CTA_COPY}.
 */
export const MARKETPLACE_ROUTES = {
  societies: { href: "/societies", label: "Societies" },
  compare: { href: "/compare", label: "Compare" },
  dealers: { href: "/dealers", label: "Dealers" },
  support: { href: "/support", label: "Get best price" },
} as const satisfies Record<string, MarketplaceNavLink>;

/** Action-oriented CTA copy for hero and landing sections — not header nav links. */
export const MARKETPLACE_CTA_COPY = {
  exploreSocieties: "Explore societies",
} as const;

/** Primary header nav links; dealers omitted when the public directory is disabled. */
export function getMarketplaceHeaderNavLinks(): readonly MarketplaceNavLink[] {
  const links: MarketplaceNavLink[] = [
    MARKETPLACE_ROUTES.societies,
    MARKETPLACE_ROUTES.compare,
  ];

  if (isPublicDealerDirectoryEnabled()) {
    links.push(MARKETPLACE_ROUTES.dealers);
  }

  return links;
}

/** Footer marketplace column — same route labels as the header for consistency. */
export function getMarketplaceFooterSections(): readonly {
  readonly heading: string;
  readonly links: readonly MarketplaceNavLink[];
}[] {
  return [
    {
      heading: "Marketplace",
      links: [
        MARKETPLACE_ROUTES.societies,
        MARKETPLACE_ROUTES.compare,
        MARKETPLACE_ROUTES.support,
      ],
    },
    {
      heading: "Trust & safety",
      links: [
        {
          href: "/societies?verificationTier=HSMS_LINKED",
          label: "HSMS-linked societies",
        },
        { href: "/support", label: "Contact support" },
      ],
    },
  ];
}

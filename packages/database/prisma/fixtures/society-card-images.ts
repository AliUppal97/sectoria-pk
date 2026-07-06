/**
 * Loadable cover images for society directory cards (Unsplash — stable CDN URLs).
 * Distinct real-estate / community imagery per demo society slug.
 */

function unsplashHero(photoId: string): string {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=800&q=80`;
}

/** Card hero URLs keyed by society slug (excludes Urban City — see urban-city-lahore fixture). */
export const SOCIETY_CARD_HERO_URLS = {
  "dha-lahore": unsplashHero("1564013799919-ab600027ffc6"),
  "bahria-town-lahore": unsplashHero("1600585154340-be6161a56a0c"),
  "capital-smart-city": unsplashHero("1486406146926-c627a92ad1ab"),
  "dha-islamabad": unsplashHero("1449844908441-8829872d2607"),
  "bahria-town-karachi": unsplashHero("1545324418-cc1a3fa10c00"),
} as const satisfies Record<string, string>;

export type SocietyCardHeroSlug = keyof typeof SOCIETY_CARD_HERO_URLS;

export function societyCardHeroUrl(slug: string): string {
  return (
    SOCIETY_CARD_HERO_URLS[slug as SocietyCardHeroSlug] ??
    unsplashHero("1560518883-ce09059eeffa")
  );
}

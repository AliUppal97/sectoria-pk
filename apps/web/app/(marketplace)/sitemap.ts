import type { MetadataRoute } from "next";
import { getApi } from "@/lib/trpc/server";
import { absoluteUrl, SITE_URL } from "@/lib/site";
import { isPublicDealerDirectoryEnabled } from "@/lib/feature-flags";
import { categoryPath, dealerPath, societyPath } from "@/lib/marketplace";

/**
 * Dynamic sitemap covering every crawlable entity — societies, their inventory
 * categories, and dealer profiles — plus the static directory/compare pages
 * (seo.mdc requires a sitemap entry per discoverable entity).
 *
 * SCALE NOTE (ADR-006): this emits a single sitemap. Past ~50k URLs, Next.js's
 * sitemap-index convention (`generateSitemaps`) should split this into
 * per-shard files; documented now even though current volume is tiny.
 *
 * If the database is unreachable at build time, fall back to the static routes
 * so the build still produces a valid (if minimal) sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    {
      url: absoluteUrl("/societies"),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    { url: absoluteUrl("/compare"), changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/support"), changeFrequency: "weekly", priority: 0.7 },
    ...(isPublicDealerDirectoryEnabled()
      ? [{ url: absoluteUrl("/dealers"), changeFrequency: "daily" as const, priority: 0.7 }]
      : []),
  ];

  try {
    const api = getApi();
    const societies = await api.society.list();

    const societyEntries: MetadataRoute.Sitemap = societies.map((society) => ({
      url: absoluteUrl(societyPath(society.citySlug, society.slug)),
      lastModified: society.createdAt,
      changeFrequency: "daily",
      priority: 0.8,
    }));

    const categoryEntries: MetadataRoute.Sitemap = (
      await Promise.all(
        societies.map(async (society) => {
          const categories = await api.inventoryCategory.listBySociety({
            societyId: society.id,
          });
          return categories.map((category) => ({
            url: absoluteUrl(
              categoryPath(society.citySlug, society.slug, category.slug),
            ),
            changeFrequency: "daily" as const,
            priority: 0.6,
          }));
        }),
      )
    ).flat();

    const dealerEntries: MetadataRoute.Sitemap = isPublicDealerDirectoryEnabled()
      ? (await api.dealer.list()).map((dealer) => ({
          url: absoluteUrl(dealerPath(dealer.slug)),
          changeFrequency: "weekly" as const,
          priority: 0.5,
        }))
      : [];

    return [
      ...staticEntries,
      ...societyEntries,
      ...categoryEntries,
      ...dealerEntries,
    ];
  } catch {
    return staticEntries;
  }
}

import type { Metadata } from "next";
import type { JsonLdSchema } from "@sectoria/ui";
import { SITE, absoluteUrl } from "./site";

/**
 * SEO helpers: page metadata and JSON-LD builders.
 *
 * Structured data is built here as typed objects and rendered through the
 * shared `<JsonLd>` component (seo.mdc) — never as hand-written inline
 * `<script>` tags per page. The builders return `JsonLdSchema` so a malformed
 * shape is a type error at the call site rather than a silent SEO bug.
 *
 * NOTE: schema.org Zod validators do not yet live in `packages/types`; these
 * builders are the typed boundary until that shared validation is added.
 */

interface PageMetadataInput {
  readonly title: string;
  readonly description: string;
  /** Site-relative path; becomes the canonical URL. */
  readonly path: string;
  /** Absolute or site-relative OG image URL. Defaults to the route's own OG. */
  readonly ogImage?: string;
  readonly keywords?: readonly string[];
}

/**
 * Builds a page's `Metadata` with a unique title/description, a self-referential
 * canonical, and Open Graph + Twitter cards. Every public page derives its
 * title/description from real entity data (seo.mdc) — pass those in, never a
 * reused static string.
 */
export function pageMetadata({
  title,
  description,
  path,
  ogImage,
  keywords,
}: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(path);
  return {
    title,
    description,
    keywords: keywords ? [...keywords] : undefined,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      title,
      description,
      url: canonical,
      ...(ogImage ? { images: [{ url: absoluteUrl(ogImage) }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [absoluteUrl(ogImage)] } : {}),
    },
  };
}

/** schema.org `Organization` for the platform itself (homepage, footer). */
export function organizationSchema(): JsonLdSchema {
  return {
    "@type": "Organization",
    name: SITE.legalName,
    url: SITE.url,
    description: SITE.description,
    email: SITE.supportEmail,
    areaServed: "PK",
  };
}

/** schema.org `WebSite` with a search action for the directory. */
export function webSiteSchema(): JsonLdSchema {
  return {
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/societies?city={city}`,
      "query-input": "required name=city",
    },
  };
}

interface SocietyOrgInput {
  readonly name: string;
  readonly city: string;
  readonly authority: string;
  readonly path: string;
  readonly description: string;
}

interface DeveloperOrganizationInput {
  readonly name: string;
  readonly description: string;
  readonly path: string;
  readonly logoUrl?: string;
  readonly websiteUrl?: string;
  readonly foundedYear?: number;
}

/** schema.org `Organization` for a housing developer / builder (M5). */
export function developerOrganizationSchema(
  developer: DeveloperOrganizationInput,
): JsonLdSchema {
  return {
    "@type": "Organization",
    name: developer.name,
    url: absoluteUrl(developer.path),
    description: developer.description,
    areaServed: "PK",
    ...(developer.logoUrl ? { logo: developer.logoUrl } : {}),
    ...(developer.websiteUrl ? { sameAs: [developer.websiteUrl] } : {}),
    ...(developer.foundedYear !== undefined
      ? { foundingDate: String(developer.foundedYear) }
      : {}),
  };
}

/** schema.org `Organization` describing a single housing society. */
export function societyOrganizationSchema(
  society: SocietyOrgInput,
): JsonLdSchema {
  return {
    "@type": "Organization",
    name: society.name,
    url: absoluteUrl(society.path),
    description: society.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: society.city,
      addressCountry: "PK",
    },
    memberOf: {
      "@type": "GovernmentOrganization",
      name: society.authority,
    },
  };
}

/** schema.org `Place` with geo coordinates for a society map pin. */
export function placeSchema(input: {
  readonly name: string;
  readonly path: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly address?: string;
}): JsonLdSchema {
  return {
    "@type": "Place",
    name: input.name,
    url: absoluteUrl(input.path),
    ...(input.address ? { address: input.address } : {}),
    geo: {
      "@type": "GeoCoordinates",
      latitude: input.latitude,
      longitude: input.longitude,
    },
  };
}

interface RealEstateListingInput {
  readonly name: string;
  readonly path: string;
  readonly description: string;
  readonly priceFrom: number | null;
  readonly priceCurrency?: string;
  readonly available: boolean;
}

/** schema.org `RealEstateListing` for an inventory category (price + availability). */
export function realEstateListingSchema(
  listing: RealEstateListingInput,
): JsonLdSchema {
  return {
    "@type": "RealEstateListing",
    name: listing.name,
    url: absoluteUrl(listing.path),
    description: listing.description,
    ...(listing.priceFrom !== null
      ? {
          offers: {
            "@type": "Offer",
            price: listing.priceFrom,
            priceCurrency: listing.priceCurrency ?? "PKR",
            availability: listing.available
              ? "https://schema.org/InStock"
              : "https://schema.org/SoldOut",
          },
        }
      : {}),
  };
}

interface AggregateRatingInput {
  readonly ratingValue: number;
  readonly reviewCount: number;
}

/** schema.org `AggregateRating` — only emit when there is at least one review. */
export function aggregateRatingSchema(
  rating: AggregateRatingInput,
): JsonLdSchema {
  return {
    "@type": "AggregateRating",
    ratingValue: Number(rating.ratingValue.toFixed(1)),
    reviewCount: rating.reviewCount,
    bestRating: 5,
    worstRating: 1,
  };
}

export interface BreadcrumbItem {
  readonly name: string;
  /** Site-relative path. */
  readonly path: string;
}

/** schema.org `ImageObject` for society hero/gallery media (M1). */
export function imageObjectSchema(input: {
  readonly url: string;
  readonly name: string;
  readonly width?: number;
  readonly height?: number;
  readonly caption?: string;
}): JsonLdSchema {
  return {
    "@type": "ImageObject",
    url: input.url.startsWith("http") ? input.url : absoluteUrl(input.url),
    name: input.name,
    ...(input.caption ? { caption: input.caption } : {}),
    ...(input.width ? { width: input.width } : {}),
    ...(input.height ? { height: input.height } : {}),
  };
}

/** schema.org `VideoObject` for click-to-load virtual tour / promo embeds (M1). */
export function videoObjectSchema(input: {
  readonly name: string;
  readonly description: string;
  readonly embedUrl: string;
  readonly thumbnailUrl?: string;
}): JsonLdSchema {
  return {
    "@type": "VideoObject",
    name: input.name,
    description: input.description,
    embedUrl: input.embedUrl,
    ...(input.thumbnailUrl ? { thumbnailUrl: input.thumbnailUrl } : {}),
  };
}

/** schema.org `BreadcrumbList` — every public page emits one (seo.mdc). */
export function breadcrumbSchema(items: readonly BreadcrumbItem[]): JsonLdSchema {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

interface ArticlePageMetadataInput extends PageMetadataInput {
  readonly authorName: string;
  readonly publishedAt?: string | null;
}

/** Blog article metadata with Open Graph `article` type and publish date. */
export function articlePageMetadata({
  title,
  description,
  path,
  ogImage,
  keywords,
  authorName,
  publishedAt,
}: ArticlePageMetadataInput): Metadata {
  const base = pageMetadata({
    title,
    description,
    path,
    ogImage,
    keywords,
  });

  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: "article",
      ...(publishedAt ? { publishedTime: publishedAt } : {}),
      authors: [authorName],
    },
  };
}

interface ArticleJsonLdInput {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly authorName: string;
  readonly publishedAt?: string | null;
  readonly modifiedAt?: string | null;
  readonly imageUrl?: string;
}

/** schema.org `Article` for blog posts (M8). */
export function articleSchema(input: ArticleJsonLdInput): JsonLdSchema {
  const pageUrl = absoluteUrl(input.path);
  const published = input.publishedAt ?? undefined;
  const modified = input.modifiedAt ?? input.publishedAt ?? undefined;

  return {
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    author: {
      "@type": "Person",
      name: input.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: SITE.legalName,
      url: SITE.url,
    },
    ...(published ? { datePublished: published } : {}),
    ...(modified ? { dateModified: modified } : {}),
    ...(input.imageUrl ? { image: [input.imageUrl] } : {}),
  };
}

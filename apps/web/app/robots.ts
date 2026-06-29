import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt — the whole public marketplace is crawlable; only the API surface
 * (tRPC/auth/webhooks) is disallowed. Points crawlers at the dynamic sitemap.
 *
 * Lives at the `app/` root (not inside the `(marketplace)` group) because that is
 * the canonical location Next.js scans for the robots metadata convention.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

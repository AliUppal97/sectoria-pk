import { SiteHeader } from "@/components/marketplace/site-header";
import { SiteFooter } from "@/components/marketplace/site-footer";

/**
 * Shell for every public marketplace route: persistent header, the page
 * content, and the footer. Route groups don't affect the URL — this group marks
 * the public, crawlable surface (seo.mdc), distinct from the authed portals.
 */
export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

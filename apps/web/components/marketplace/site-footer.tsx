import Link from "next/link";
import { getMarketplaceFooterSections } from "@/lib/marketplace-nav";
import { SITE } from "@/lib/site";

/**
 * Public marketplace footer. Plain navigation + the trust positioning line;
 * deliberately quiet (no fear-based or promotional microcopy, design spec §10).
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  const footerSections = getMarketplaceFooterSections();
  return (
    <footer className="border-t border-border-base bg-surface-card">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div className="flex flex-col gap-2">
          <span className="font-sans text-lg font-bold text-text-primary">
            {SITE.name}
            <span className="text-brand-accent">.pk</span>
          </span>
          <p className="max-w-xs font-sans text-sm text-text-tertiary">
            {SITE.tagline}. Every listing is checked against development-authority
            approvals and verified data before listing — not dealer contact details.
          </p>
        </div>

        {footerSections.map((section) => (
          <nav key={section.heading} aria-label={section.heading}>
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">
              {section.heading}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-[44px] items-center font-sans text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border-base">
        <p className="mx-auto max-w-[1280px] px-4 py-4 font-sans text-xs text-text-tertiary sm:px-6">
          © {year} {SITE.legalName}. All listings subject to verification status
          shown on each profile.
        </p>
      </div>
    </footer>
  );
}

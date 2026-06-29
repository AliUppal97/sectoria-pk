import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@sectoria/ui";
import { SITE } from "@/lib/site";

const NAV_LINKS = [
  { href: "/societies", label: "Societies" },
  { href: "/compare", label: "Compare" },
  { href: "/dealers", label: "Dealers" },
] as const;

/**
 * Public marketplace header. Server component — no interactivity needed beyond
 * navigation. Links use generous touch targets (≥44px) and a visible focus ring
 * via the global `:focus-visible` style. The brand mark doubles as the home link.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-base bg-surface-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md font-sans text-lg font-bold text-text-primary"
          aria-label={`${SITE.name} home`}
        >
          <ShieldCheck
            aria-hidden="true"
            className="h-6 w-6 text-brand-accent"
            strokeWidth={2.25}
          />
          <span>
            {SITE.name}
            <span className="text-brand-accent">.pk</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-[44px] items-center rounded-md px-2.5 font-sans text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-surface-subtle hover:text-text-primary sm:px-3"
            >
              {link.label}
            </Link>
          ))}
          <Button asChild size="sm" className="ml-1 hidden sm:inline-flex">
            <Link href="/societies">Explore societies</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

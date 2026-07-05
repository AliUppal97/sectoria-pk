import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SITE } from "@/lib/site";
import { SiteHeaderNav } from "./site-header-nav";

/**
 * Public marketplace header. The brand mark is server-rendered; navigation is a
 * client leaf so mobile can use a hamburger drawer without marking the whole
 * header interactive (nextjs-app-router.mdc).
 */
export function SiteHeader() {
  return (
    <header
      id="site-header"
      className="sticky top-0 z-50 border-b border-border-base bg-surface-card md:bg-surface-card/90 md:backdrop-blur"
    >
      <div className="relative mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 rounded-md font-sans text-lg font-bold text-text-primary"
          aria-label={`${SITE.name} home`}
        >
          <ShieldCheck
            aria-hidden="true"
            className="h-6 w-6 shrink-0 text-brand-accent"
            strokeWidth={2.25}
          />
          <span className="truncate">
            {SITE.name}
            <span className="text-brand-accent">.pk</span>
          </span>
        </Link>

        <SiteHeaderNav />
      </div>
    </header>
  );
}

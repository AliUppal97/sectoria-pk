"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@sectoria/ui";
import { SITE } from "@/lib/site";

const NAV_LINKS = [
  { href: "/societies", label: "Societies" },
  { href: "/compare", label: "Compare" },
  { href: "/dealers", label: "Dealers" },
] as const;

const mobileNavLinkClassName =
  "flex min-h-[52px] w-full items-center border-b border-border-base px-5 font-sans text-base font-medium text-text-primary transition-colors duration-150 last:border-b-0 active:bg-surface-subtle";

const HISTORY_STATE_KEY = "marketplaceMobileNav";

/**
 * Primary navigation for the public marketplace header.
 *
 * Mobile uses a controlled slide-in drawer. A history entry is pushed while
 * open so iOS/Android back closes the menu instead of leaving the page. The
 * drawer sits below the sticky header so the toggle stays tappable.
 */
export function SiteHeaderNav() {
  const [isOpen, setIsOpen] = useState(false);
  const closedFromPopState = useRef(false);

  const closeMenu = useCallback(() => {
    setIsOpen(false);

    if (closedFromPopState.current) {
      closedFromPopState.current = false;
      return;
    }

    if (history.state?.[HISTORY_STATE_KEY]) {
      history.back();
    }
  }, []);

  const openMenu = useCallback(() => {
    setIsOpen(true);
  }, []);

  const toggleMenu = useCallback(() => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [closeMenu, isOpen, openMenu]);

  useEffect(() => {
    if (!isOpen) return;

    history.pushState({ [HISTORY_STATE_KEY]: true }, "");

    function onPopState() {
      closedFromPopState.current = true;
      setIsOpen(false);
    }

    window.addEventListener("popstate", onPopState);
    document.documentElement.classList.add("mobile-nav-open");

    return () => {
      window.removeEventListener("popstate", onPopState);
      document.documentElement.classList.remove("mobile-nav-open");
    };
  }, [isOpen]);

  return (
    <>
      <nav
        aria-label="Primary"
        className="hidden items-center gap-1 md:flex md:flex-nowrap md:gap-2"
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-[44px] items-center rounded-md px-3 font-sans text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-surface-subtle hover:text-text-primary"
          >
            {link.label}
          </Link>
        ))}
        <Button asChild size="sm" className="ml-1 shrink-0">
          <Link href="/societies">Explore societies</Link>
        </Button>
      </nav>

      <div className="mobile-nav shrink-0 md:hidden">
        <button
          type="button"
          className="mobile-nav-toggle"
          aria-expanded={isOpen}
          aria-controls="marketplace-mobile-nav"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={toggleMenu}
        >
          <Menu aria-hidden="true" className="mobile-nav-icon-open h-5 w-5" />
          <X aria-hidden="true" className="mobile-nav-icon-close h-5 w-5" />
        </button>

        {isOpen ? (
          <div className="mobile-nav-drawer">
            <button
              type="button"
              className="mobile-nav-backdrop"
              aria-label="Close navigation menu"
              onClick={closeMenu}
            />

            <nav
              id="marketplace-mobile-nav"
              aria-label="Primary"
              className="mobile-nav-panel"
            >
              <div className="mobile-nav-panel-header">
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                  Navigation
                </p>
                <p className="mt-1 font-sans text-lg font-bold text-text-primary">
                  {SITE.name}
                  <span className="text-brand-accent">.pk</span>
                </p>
              </div>

              <ul className="flex flex-1 flex-col overflow-y-auto">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={mobileNavLinkClassName}
                      onClick={closeMenu}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mobile-nav-panel-footer">
                <Button asChild className="w-full">
                  <Link href="/societies" onClick={closeMenu}>
                    Explore societies
                  </Link>
                </Button>
              </div>
            </nav>
          </div>
        ) : null}
      </div>
    </>
  );
}

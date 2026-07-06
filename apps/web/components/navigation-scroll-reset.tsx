"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Ensures client-side navigations start at the top of the document, matching
 * standard MPA / professional SPA behavior (routing-and-navigation.mdc).
 *
 * Next.js scroll handling can preserve position when sibling routes share a
 * layout; this resets scroll on pathname changes while still allowing
 * back/forward restoration and in-page hash navigation.
 */
export function NavigationScrollReset() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const previousPathnameRef = useRef(pathname);
  const skipScrollRef = useRef(false);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    function onPopState() {
      const pathnameAtPop = pathnameRef.current;
      skipScrollRef.current = true;

      // Mobile nav uses pushState without changing the route; clear the skip
      // flag when popstate did not actually navigate to a different page.
      queueMicrotask(() => {
        if (pathnameRef.current === pathnameAtPop) {
          skipScrollRef.current = false;
        }
      });
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useLayoutEffect(() => {
    if (skipScrollRef.current) {
      skipScrollRef.current = false;
      previousPathnameRef.current = pathname;
      return;
    }

    if (previousPathnameRef.current !== pathname) {
      window.scrollTo(0, 0);
      previousPathnameRef.current = pathname;
    }
  }, [pathname]);

  return null;
}

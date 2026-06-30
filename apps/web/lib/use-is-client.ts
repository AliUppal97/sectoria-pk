"use client";

import { useSyncExternalStore } from "react";

/**
 * Returns `true` only in the browser after hydration. Use to gate UI that
 * depends on client-only state (e.g. `usePathname` active-link styling) so the
 * server HTML matches the first client render.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

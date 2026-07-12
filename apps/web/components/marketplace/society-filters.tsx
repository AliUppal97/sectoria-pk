"use client";

/**
 * Thin wrap — one source of truth is `SocietyDiscoveryBar` (H2 / discovery-search
 * §4). Kept so any lingering imports resolve to the shared discovery bar.
 */
export {
  SocietyDiscoveryBar as SocietyFilters,
  type SocietyDiscoveryBarProps as SocietyFiltersProps,
} from "./society-discovery-bar";

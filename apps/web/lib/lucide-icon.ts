import {
  BadgeCheck,
  Building,
  Map,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Known Lucide icons referenced by admin-entered kebab-case names. */
export const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  "badge-check": BadgeCheck,
  building: Building,
  map: Map,
  "shield-check": ShieldCheck,
  store: Store,
  "trending-up": TrendingUp,
  zap: Zap,
};

/** Resolve a design-system icon name to a Lucide component from the static map. */
export function resolveLucideIcon(
  iconName: string | null | undefined,
): LucideIcon {
  if (!iconName?.trim()) return Sparkles;
  return LUCIDE_ICON_MAP[iconName.trim().toLowerCase()] ?? Sparkles;
}

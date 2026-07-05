import type { CategoryView } from "@/components/marketplace/category-card";
import {
  filterMediaByKind,
  isResolvableImageUrl,
  type SocietyMediaPublic,
} from "@/lib/society-media";
import { SocietyMediaKind } from "@sectoria/types";

export interface PhaseGroup {
  readonly phase: string;
  readonly anchorId: string;
  readonly blocks: readonly string[];
  readonly categories: readonly CategoryView[];
  readonly startingPrice: number;
  readonly availableUnits: number;
  readonly totalUnits: number;
  readonly image: SocietyMediaPublic | null;
}

function phaseAnchorId(phase: string): string {
  const slug = phase
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug ? `phase-${slug}` : "phase";
}

/**
 * Picks the first GALLERY image whose alt/caption mentions the phase name.
 * Media has no dedicated phase tag yet — caption/alt matching keeps the diff minimal.
 */
export function pickPhaseGalleryImage(
  media: readonly SocietyMediaPublic[],
  phase: string,
): SocietyMediaPublic | null {
  const needle = phase.trim().toLowerCase();
  if (!needle) return null;

  const gallery = filterMediaByKind(media, SocietyMediaKind.GALLERY);
  const match = gallery.find((item) => {
    const alt = item.alt.toLowerCase();
    const caption = item.caption?.toLowerCase() ?? "";
    return alt.includes(needle) || caption.includes(needle);
  });

  if (!match || !isResolvableImageUrl(match.url)) return null;
  return match;
}

function summarizePhase(
  phase: string,
  categories: CategoryView[],
  media: readonly SocietyMediaPublic[],
): PhaseGroup {
  const blocks = [...new Set(categories.map((c) => c.block))].sort((a, b) =>
    a.localeCompare(b),
  );
  const startingPrice = Math.min(...categories.map((c) => c.totalPrice));
  const availableUnits = categories.reduce((sum, c) => sum + c.availableUnits, 0);
  const totalUnits = categories.reduce((sum, c) => sum + c.totalUnits, 0);

  return {
    phase,
    anchorId: phaseAnchorId(phase),
    blocks,
    categories,
    startingPrice,
    availableUnits,
    totalUnits,
    image: pickPhaseGalleryImage(media, phase),
  };
}

/** Groups inventory categories by phase at read time (no schema change). */
export function groupCategoriesByPhase(
  categories: readonly CategoryView[],
  media: readonly SocietyMediaPublic[] = [],
): PhaseGroup[] {
  const byPhase = new Map<string, CategoryView[]>();

  for (const category of categories) {
    const existing = byPhase.get(category.phase);
    if (existing) {
      existing.push(category);
    } else {
      byPhase.set(category.phase, [category]);
    }
  }

  return [...byPhase.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([phase, phaseCategories]) =>
      summarizePhase(
        phase,
        [...phaseCategories].sort(
          (a, b) => a.block.localeCompare(b.block) || a.sizeSqft - b.sizeSqft,
        ),
        media,
      ),
    );
}

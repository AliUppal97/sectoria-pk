import { LandmarkCategory } from "@sectoria/types";
import type { NearbyLandmark } from "@sectoria/types";

/** Public landmark row from `landmark.listForSociety`. */
export type NearbyLandmarkPublic = NearbyLandmark;

export const LANDMARK_CATEGORY_LABEL: Record<
  (typeof LandmarkCategory)[keyof typeof LandmarkCategory],
  string
> = {
  [LandmarkCategory.AIRPORT]: "Airport",
  [LandmarkCategory.HOSPITAL]: "Hospital",
  [LandmarkCategory.SCHOOL]: "School",
  [LandmarkCategory.UNIVERSITY]: "University",
  [LandmarkCategory.MARKET]: "Market",
  [LandmarkCategory.MOSQUE]: "Mosque",
  [LandmarkCategory.HIGHWAY]: "Highway",
  [LandmarkCategory.INTERCHANGE]: "Interchange",
  [LandmarkCategory.LANDMARK]: "Landmark",
};

/** Profile display order for landmark category groups. */
export const LANDMARK_CATEGORY_ORDER: readonly (typeof LandmarkCategory)[keyof typeof LandmarkCategory][] =
  [
    LandmarkCategory.INTERCHANGE,
    LandmarkCategory.HIGHWAY,
    LandmarkCategory.AIRPORT,
    LandmarkCategory.HOSPITAL,
    LandmarkCategory.SCHOOL,
    LandmarkCategory.UNIVERSITY,
    LandmarkCategory.MARKET,
    LandmarkCategory.MOSQUE,
    LandmarkCategory.LANDMARK,
  ];

export interface LandmarkCategoryGroup {
  readonly category: (typeof LandmarkCategory)[keyof typeof LandmarkCategory];
  readonly label: string;
  readonly items: readonly NearbyLandmarkPublic[];
}

/** Group landmarks by category in profile display order. */
export function groupLandmarksByCategory(
  landmarks: readonly NearbyLandmarkPublic[],
): LandmarkCategoryGroup[] {
  const byCategory = new Map<
    (typeof LandmarkCategory)[keyof typeof LandmarkCategory],
    NearbyLandmarkPublic[]
  >();

  for (const landmark of landmarks) {
    const list = byCategory.get(landmark.category) ?? [];
    list.push(landmark);
    byCategory.set(landmark.category, list);
  }

  return LANDMARK_CATEGORY_ORDER.flatMap((category) => {
    const items = (byCategory.get(category) ?? []).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    if (items.length === 0) return [];
    return [{ category, label: LANDMARK_CATEGORY_LABEL[category], items }];
  });
}

/** Human-readable drive time — e.g. "25 min drive". */
export function formatDriveTime(mins: number): string {
  return mins === 1 ? "1 min drive" : `${mins} min drive`;
}

/** Human-readable distance — e.g. "18.5 km". */
export function formatLandmarkDistanceKm(distanceKm: string): string {
  const value = Number.parseFloat(distanceKm);
  if (Number.isNaN(value)) return distanceKm;
  const formatted =
    value >= 10 ? Math.round(value).toString() : value.toFixed(1);
  return `${formatted} km`;
}

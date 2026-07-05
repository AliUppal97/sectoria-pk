import {
  Building,
  GraduationCap,
  Hospital,
  MapPin,
  Plane,
  Route,
  ShoppingBag,
  Signpost,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { EmptyState, Skeleton } from "@sectoria/ui";
import { LandmarkCategory } from "@sectoria/types";
import {
  formatDriveTime,
  formatLandmarkDistanceKm,
  groupLandmarksByCategory,
  type NearbyLandmarkPublic,
} from "@/lib/society-landmarks";

const CATEGORY_ICON: Record<
  (typeof LandmarkCategory)[keyof typeof LandmarkCategory],
  LucideIcon
> = {
  [LandmarkCategory.AIRPORT]: Plane,
  [LandmarkCategory.HOSPITAL]: Hospital,
  [LandmarkCategory.SCHOOL]: GraduationCap,
  [LandmarkCategory.UNIVERSITY]: GraduationCap,
  [LandmarkCategory.MARKET]: ShoppingBag,
  [LandmarkCategory.MOSQUE]: Building,
  [LandmarkCategory.HIGHWAY]: Route,
  [LandmarkCategory.INTERCHANGE]: Signpost,
  [LandmarkCategory.LANDMARK]: MapPin,
};

function LandmarkRow({ landmark }: { landmark: NearbyLandmarkPublic }) {
  const details: string[] = [];
  if (landmark.driveTimeMins != null) {
    details.push(formatDriveTime(landmark.driveTimeMins));
  }
  if (landmark.distanceKm != null && landmark.distanceKm.length > 0) {
    details.push(formatLandmarkDistanceKm(landmark.distanceKm));
  }

  return (
    <li className="flex min-h-[44px] items-start justify-between gap-3 rounded-lg border border-border-base bg-surface-base px-3 py-3">
      <span className="font-sans text-sm font-medium text-text-primary">
        {landmark.name}
      </span>
      {details.length > 0 ? (
        <span className="shrink-0 text-right font-mono text-xs text-text-secondary">
          {details.join(" · ")}
        </span>
      ) : null}
    </li>
  );
}

/** Content-shaped skeleton for deferred landmark loads. */
export function SocietyConnectivitySkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/**
 * Curated nearby landmarks grouped by category (M4). Admin-entered values
 * only — no Places API (ADR-008). Renders inside the location section;
 * hidden cleanly when empty so the map-only view still works.
 */
export function SocietyConnectivity({
  societyName,
  landmarks,
  degraded = false,
  loading = false,
}: {
  societyName: string;
  landmarks: readonly NearbyLandmarkPublic[];
  degraded?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return <SocietyConnectivitySkeleton />;
  }

  if (degraded) {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="font-sans text-sm font-semibold text-text-primary">
          Connectivity
        </h3>
        <EmptyState
          heading="Connectivity details temporarily unavailable"
          description={`We couldn't load nearby landmarks for ${societyName} right now. The map above is still available.`}
        />
      </div>
    );
  }

  if (landmarks.length === 0) return null;

  const groups = groupLandmarksByCategory(landmarks);

  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      <div className="flex flex-col gap-1">
        <h3 className="font-sans text-sm font-semibold text-text-primary">
          Connectivity
        </h3>
        <p className="font-sans text-xs text-text-secondary">
          Curated drive-times to key landmarks near {societyName}. Values are
          entered by the society — not live traffic data.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {groups.map((group) => {
          const Icon = CATEGORY_ICON[group.category] ?? Sparkles;
          return (
            <section
              key={group.category}
              aria-labelledby={`landmark-group-${group.category}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <Icon
                  aria-hidden="true"
                  className="h-4 w-4 text-text-tertiary"
                />
                <h4
                  id={`landmark-group-${group.category}`}
                  className="font-sans text-xs font-semibold uppercase tracking-[0.06em] text-text-tertiary"
                >
                  {group.label}
                </h4>
              </div>
              <ul className="flex flex-col gap-2">
                {group.items.map((landmark) => (
                  <LandmarkRow key={landmark.id} landmark={landmark} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import type { geoJsonBoundarySchema } from "@sectoria/types";
import type { z } from "zod";

type GeoJsonBoundary = z.infer<typeof geoJsonBoundarySchema>;

/** Placeholder while the Leaflet bundle loads — kept here (not in the map module) so SSR/prerender never imports Leaflet. */
function SocietyLocationMapSkeleton() {
  return (
    <div
      className="h-64 animate-pulse rounded-xl border border-border-base bg-surface-subtle sm:h-80"
      aria-hidden="true"
    />
  );
}

const SocietyLocationMap = dynamic(
  () =>
    import("@/components/marketplace/society-location-map").then(
      (module) => module.SocietyLocationMap,
    ),
  { ssr: false, loading: () => <SocietyLocationMapSkeleton /> },
);

/** Client boundary for Leaflet — `ssr: false` dynamic import must live here. */
export function SocietyLocationMapDynamic({
  latitude,
  longitude,
  boundaryGeoJson,
  societyName,
}: {
  latitude: number;
  longitude: number;
  boundaryGeoJson: GeoJsonBoundary | null;
  societyName: string;
}) {
  return (
    <SocietyLocationMap
      latitude={latitude}
      longitude={longitude}
      boundaryGeoJson={boundaryGeoJson}
      societyName={societyName}
    />
  );
}

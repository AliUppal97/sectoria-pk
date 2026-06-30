"use client";

import dynamic from "next/dynamic";
import type { geoJsonBoundarySchema } from "@sectoria/types";
import type { z } from "zod";
import {
  SocietyLocationMapSkeleton,
} from "@/components/marketplace/society-location-map";

type GeoJsonBoundary = z.infer<typeof geoJsonBoundarySchema>;

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

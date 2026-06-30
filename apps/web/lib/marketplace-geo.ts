import area from "@turf/area";
import { sqMetersToKanal } from "@sectoria/domain-land";
import type { geoJsonBoundarySchema } from "@sectoria/types";
import type { z } from "zod";

type GeoJsonBoundary = z.infer<typeof geoJsonBoundarySchema>;

/** Approximate land area in kanal from a GeoJSON boundary polygon. */
export function boundaryKanalApprox(
  boundary: GeoJsonBoundary | null | undefined,
): number | null {
  if (boundary === null || boundary === undefined) return null;
  try {
    const sqMeters = area(boundary as GeoJSON.Polygon | GeoJSON.MultiPolygon);
    return sqMetersToKanal(sqMeters);
  } catch {
    return null;
  }
}

/** Haversine distance in kilometres between two WGS84 points. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function googleMapsPlaceUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

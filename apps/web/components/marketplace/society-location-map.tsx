"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  useMap,
} from "react-leaflet";
import { Button, cn } from "@sectoria/ui";
import type { geoJsonBoundarySchema } from "@sectoria/types";
import type { z } from "zod";
import "leaflet/dist/leaflet.css";

type GeoJsonBoundary = z.infer<typeof geoJsonBoundarySchema>;

/** Leaflet's default marker assets break under bundlers — point at CDN copies. */
const MARKER_ICON = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function boundaryPositions(
  boundary: GeoJsonBoundary,
): [number, number][] | null {
  if (boundary.type === "Polygon") {
    const ring = boundary.coordinates[0];
    if (!Array.isArray(ring)) return null;
    return ring.map((coord) => {
      const [lng, lat] = coord as [number, number];
      return [lat, lng] as [number, number];
    });
  }
  return null;
}

function FitBounds({
  lat,
  lng,
  boundary,
}: {
  lat: number;
  lng: number;
  boundary: GeoJsonBoundary | null;
}) {
  const map = useMap();
  useEffect(() => {
    const positions = boundary ? boundaryPositions(boundary) : null;
    if (positions !== null && positions.length > 0) {
      map.fitBounds(positions, { padding: [24, 24] });
    } else {
      map.setView([lat, lng], 13);
    }
  }, [map, lat, lng, boundary]);
  return null;
}

export function SocietyLocationMap({
  latitude,
  longitude,
  boundaryGeoJson,
  societyName,
  className,
}: {
  latitude: number;
  longitude: number;
  boundaryGeoJson: GeoJsonBoundary | null;
  societyName: string;
  className?: string;
}) {
  const [satellite, setSatellite] = useState(false);
  const boundaryRing = useMemo(
    () => (boundaryGeoJson ? boundaryPositions(boundaryGeoJson) : null),
    [boundaryGeoJson],
  );

  const streetUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const satelliteUrl =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-sans text-xs text-text-tertiary">
          Map data © OpenStreetMap contributors
          {satellite ? " · Imagery © Esri" : ""}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={satellite}
          onClick={() => setSatellite((value) => !value)}
        >
          {satellite ? "Street map" : "Satellite view"}
        </Button>
      </div>
      <div className="h-64 overflow-hidden rounded-xl border border-border-base sm:h-80">
        <MapContainer
          center={[latitude, longitude]}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full"
          aria-label={`Map showing location of ${societyName}`}
        >
          <TileLayer
            key={satellite ? "satellite" : "street"}
            attribution=""
            url={satellite ? satelliteUrl : streetUrl}
          />
          <FitBounds
            lat={latitude}
            lng={longitude}
            boundary={boundaryGeoJson}
          />
          <Marker position={[latitude, longitude]} icon={MARKER_ICON} />
          {boundaryRing !== null ? (
            <Polygon
              positions={boundaryRing}
              pathOptions={{ color: "#1e3a5f", weight: 2, fillOpacity: 0.15 }}
            />
          ) : null}
        </MapContainer>
      </div>
    </div>
  );
}

export function SocietyLocationMapSkeleton() {
  return (
    <div
      className="h-64 animate-pulse rounded-xl border border-border-base bg-surface-subtle sm:h-80"
      aria-hidden="true"
    />
  );
}

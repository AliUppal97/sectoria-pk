"use client";

import { useCallback, useState } from "react";
import { Button } from "@sectoria/ui";
import { MapPin, Navigation } from "lucide-react";
import { distanceKm, formatDistanceKm } from "@/lib/marketplace-geo";

export function SocietyDistance({
  societyLat,
  societyLng,
}: {
  societyLat: number;
  societyLng: number;
}) {
  const [distance, setDistance] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "denied" | "unavailable" | "ready"
  >("idle");

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const km = distanceKm(
          position.coords.latitude,
          position.coords.longitude,
          societyLat,
          societyLng,
        );
        setDistance(km);
        setStatus("ready");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [societyLat, societyLng]);

  return (
    <div className="flex flex-col gap-2">
      <span className="font-sans text-xs text-text-tertiary">
        Distance from you
      </span>
      {status === "ready" && distance !== null ? (
        <p className="flex items-center gap-1.5 font-mono text-md font-semibold text-text-primary">
          <Navigation aria-hidden="true" className="h-4 w-4 text-text-accent" />
          {formatDistanceKm(distance)} away
        </p>
      ) : status === "denied" ? (
        <p className="font-sans text-sm text-text-secondary">
          Location access was denied. Enable it in your browser settings to see
          distance.
        </p>
      ) : status === "unavailable" ? (
        <p className="font-sans text-sm text-text-secondary">
          Your browser does not support location services.
        </p>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          disabled={status === "loading"}
          onClick={requestLocation}
        >
          <MapPin aria-hidden="true" className="h-4 w-4" />
          {status === "loading" ? "Getting location…" : "Use my location"}
        </Button>
      )}
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  FieldError,
  Input,
  Label,
} from "@sectoria/ui";
import { geoJsonBoundarySchema } from "@sectoria/types";
import { api } from "@/lib/trpc/react";

interface LocationLandFormProps {
  societyId: string;
  addressLine: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  totalLandKanal: string | null;
  developedLandKanal: string | null;
  boundaryGeoJson: string | null;
}

export function LocationLandForm({
  societyId,
  addressLine,
  district,
  latitude,
  longitude,
  totalLandKanal,
  developedLandKanal,
  boundaryGeoJson,
}: LocationLandFormProps) {
  const router = useRouter();
  const [address, setAddress] = useState(addressLine ?? "");
  const [districtValue, setDistrictValue] = useState(district ?? "");
  const [lat, setLat] = useState(latitude?.toString() ?? "");
  const [lng, setLng] = useState(longitude?.toString() ?? "");
  const [totalKanal, setTotalKanal] = useState(totalLandKanal ?? "");
  const [developedKanal, setDevelopedKanal] = useState(developedLandKanal ?? "");
  const [boundaryText, setBoundaryText] = useState(boundaryGeoJson ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = api.society.update.useMutation({
    onSuccess: () => {
      setSuccess("Location and land settings saved.");
      router.refresh();
    },
    onError: (err: { message: string }) => setError(err.message),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    let parsedBoundary: ReturnType<typeof geoJsonBoundarySchema.parse> | null =
      null;
    if (boundaryText.trim().length > 0) {
      try {
        parsedBoundary = geoJsonBoundarySchema.parse(
          JSON.parse(boundaryText) as unknown,
        );
      } catch {
        setError(
          "Boundary GeoJSON is invalid. Paste a valid Polygon or MultiPolygon.",
        );
        return;
      }
    }

    const latNum = lat.trim().length > 0 ? Number(lat) : null;
    const lngNum = lng.trim().length > 0 ? Number(lng) : null;
    if (
      (latNum !== null && Number.isNaN(latNum)) ||
      (lngNum !== null && Number.isNaN(lngNum))
    ) {
      setError("Latitude and longitude must be valid numbers.");
      return;
    }

    mutation.mutate({
      societyId,
      data: {
        addressLine: address.trim().length > 0 ? address.trim() : null,
        district: districtValue.trim().length > 0 ? districtValue.trim() : null,
        latitude: latNum,
        longitude: lngNum,
        totalLandKanal: totalKanal.trim().length > 0 ? totalKanal.trim() : null,
        developedLandKanal:
          developedKanal.trim().length > 0 ? developedKanal.trim() : null,
        boundaryGeoJson: parsedBoundary,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
      <div>
        <Label htmlFor="addressLine">Street address</Label>
        <Input
          id="addressLine"
          className="mt-1.5"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Main Boulevard, Phase 6"
        />
      </div>
      <div>
        <Label htmlFor="district">District / tehsil</Label>
        <Input
          id="district"
          className="mt-1.5"
          value={districtValue}
          onChange={(e) => setDistrictValue(e.target.value)}
          placeholder="Lahore Cantonment"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            className="mt-1.5 font-mono"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="31.4697"
          />
        </div>
        <div>
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            className="mt-1.5 font-mono"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="74.4117"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="totalLandKanal">Total land (kanal)</Label>
          <Input
            id="totalLandKanal"
            className="mt-1.5 font-mono"
            value={totalKanal}
            onChange={(e) => setTotalKanal(e.target.value)}
            placeholder="4500"
          />
        </div>
        <div>
          <Label htmlFor="developedLandKanal">Developed land (kanal)</Label>
          <Input
            id="developedLandKanal"
            className="mt-1.5 font-mono"
            value={developedKanal}
            onChange={(e) => setDevelopedKanal(e.target.value)}
            placeholder="3825"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="boundaryGeoJson">Boundary GeoJSON (optional)</Label>
        <textarea
          id="boundaryGeoJson"
          className="mt-1.5 min-h-32 w-full rounded-md border border-border-base bg-surface-card px-3 py-2 font-mono text-xs text-text-primary"
          value={boundaryText}
          onChange={(e) => setBoundaryText(e.target.value)}
          placeholder='{"type":"Polygon","coordinates":[...]}'
        />
        <p className="mt-1 font-sans text-xs text-text-tertiary">
          Paste a GeoJSON Polygon or MultiPolygon to show the society boundary on
          the public map.
        </p>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
      {success ? (
        <p className="font-sans text-sm text-success-text">{success}</p>
      ) : null}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Save location & land"}
      </Button>
    </form>
  );
}

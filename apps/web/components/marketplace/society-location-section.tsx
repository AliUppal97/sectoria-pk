import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@sectoria/ui";
import type { geoJsonBoundarySchema } from "@sectoria/types";
import type { z } from "zod";
import { BentoCell, BentoGrid } from "@/components/marketplace/bento";
import { SocietyConnectivity } from "@/components/marketplace/society-connectivity";
import { SocietyDistance } from "@/components/marketplace/society-distance";
import { SocietyLandArea } from "@/components/marketplace/society-land-area";
import { SocietyLocationMapDynamic } from "@/components/marketplace/society-location-map-dynamic";
import type { NearbyLandmarkPublic } from "@/lib/society-landmarks";
import {
  googleMapsDirectionsUrl,
  googleMapsPlaceUrl,
} from "@/lib/marketplace-geo";

type GeoJsonBoundary = z.infer<typeof geoJsonBoundarySchema>;

export function SocietyLocationSection({
  societyName,
  city,
  addressLine,
  district,
  latitude,
  longitude,
  totalLandKanal,
  developedLandKanal,
  boundaryGeoJson,
  landmarks = [],
  landmarksDegraded = false,
}: {
  societyName: string;
  city: string;
  addressLine: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  totalLandKanal: string | null;
  developedLandKanal: string | null;
  boundaryGeoJson: GeoJsonBoundary | null;
  landmarks?: readonly NearbyLandmarkPublic[];
  landmarksDegraded?: boolean;
}) {
  const hasCoords = latitude !== null && longitude !== null;
  const addressParts = [addressLine, district, `${city}, Pakistan`].filter(
    (part): part is string => part !== null && part.length > 0,
  );

  return (
    <section id="location" className="scroll-mt-20 border-t border-border-base">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <BentoGrid>
          <BentoCell size="wide" className="flex flex-col gap-4">
            <h2 className="font-sans text-lg font-bold text-text-primary">
              Location & land
            </h2>
            {addressParts.length > 0 ? (
              <p className="flex items-start gap-1.5 font-sans text-sm text-text-secondary">
                <MapPin
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary"
                />
                {addressParts.join(" · ")}
              </p>
            ) : null}
            {hasCoords ? (
              <>
                <SocietyLocationMapDynamic
                  latitude={latitude}
                  longitude={longitude}
                  boundaryGeoJson={boundaryGeoJson}
                  societyName={societyName}
                />
                <div className="flex flex-wrap items-start gap-6">
                  <SocietyDistance
                    key={`${latitude}-${longitude}`}
                    societyLat={latitude}
                    societyLng={longitude}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={googleMapsDirectionsUrl(latitude, longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink aria-hidden="true" className="h-4 w-4" />
                        Open in Google Maps
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={googleMapsPlaceUrl(latitude, longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on map
                      </Link>
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="font-sans text-sm text-text-secondary">
                Map coordinates for this society have not been published yet.
              </p>
            )}
            <SocietyConnectivity
              societyName={societyName}
              landmarks={landmarks}
              degraded={landmarksDegraded}
            />
          </BentoCell>
          <BentoCell className="flex flex-col gap-3">
            <h2 className="font-sans text-md font-semibold text-text-primary">
              Land area
            </h2>
            <SocietyLandArea
              totalLandKanal={totalLandKanal}
              developedLandKanal={developedLandKanal}
              boundaryGeoJson={boundaryGeoJson}
            />
          </BentoCell>
        </BentoGrid>
      </div>
    </section>
  );
}

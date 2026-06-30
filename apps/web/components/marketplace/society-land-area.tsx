import {
  developedLandPct,
  formatLandKanal,
  parseKanalString,
} from "@sectoria/domain-land";
import type { geoJsonBoundarySchema } from "@sectoria/types";
import type { z } from "zod";
import { boundaryKanalApprox } from "@/lib/marketplace-geo";

type GeoJsonBoundary = z.infer<typeof geoJsonBoundarySchema>;

export function SocietyLandArea({
  totalLandKanal,
  developedLandKanal,
  boundaryGeoJson,
}: {
  totalLandKanal: string | null;
  developedLandKanal: string | null;
  boundaryGeoJson: GeoJsonBoundary | null;
}) {
  const officialTotal = totalLandKanal ? parseKanalString(totalLandKanal) : null;
  const officialDeveloped = developedLandKanal
    ? parseKanalString(developedLandKanal)
    : null;
  const approxFromBoundary = boundaryKanalApprox(boundaryGeoJson);
  const developedPct =
    officialTotal !== null && officialDeveloped !== null
      ? developedLandPct(officialTotal, officialDeveloped)
      : null;

  if (
    officialTotal === null &&
    officialDeveloped === null &&
    approxFromBoundary === null
  ) {
    return null;
  }

  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {officialTotal !== null ? (
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-xs text-text-tertiary">
            Total project land
          </dt>
          <dd className="font-mono text-md font-semibold text-text-primary">
            {formatLandKanal(officialTotal)}
          </dd>
        </div>
      ) : null}
      {officialDeveloped !== null ? (
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-xs text-text-tertiary">
            Developed land
          </dt>
          <dd className="font-mono text-md font-semibold text-text-primary">
            {formatLandKanal(officialDeveloped)}
            {developedPct !== null ? (
              <span className="ml-2 font-sans text-sm font-normal text-text-tertiary">
                ({developedPct}% of total)
              </span>
            ) : null}
          </dd>
        </div>
      ) : null}
      {approxFromBoundary !== null ? (
        <div className="flex flex-col gap-1 sm:col-span-2">
          <dt className="font-sans text-xs text-text-tertiary">
            Map boundary (approx.)
          </dt>
          <dd className="font-mono text-sm text-text-secondary">
            ~{formatLandKanal(approxFromBoundary)} from plotted boundary
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

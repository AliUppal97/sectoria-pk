import { ImageResponse } from "next/og";
import { formatPKR } from "@sectoria/ui";
import { getApi } from "@/lib/trpc/server";
import { priceToNumber, VERIFICATION_TIER_META } from "@/lib/marketplace";
import { SITE } from "@/lib/site";

/**
 * Dynamic Open Graph image per society (build-prompt §6.4) — a branded card so
 * shared links look professional on WhatsApp/Facebook, the primary channels for
 * Pakistani property sharing. Colours are the brand tokens as literals because
 * `next/og` renders to a raster and can't consume CSS custom properties.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Society profile on Sectoria";

// Brand token values mirrored from packages/ui/theme.css (§2). Kept in sync
// manually because the OG raster renderer has no access to the CSS tokens.
const NAVY = "#0A1628";
const NAVY_MID = "#0F3460";
const ACCENT = "#00C896";
const INVERSE = "#FFFFFF";
const MUTED = "rgba(255,255,255,0.65)";

export default async function Image({
  params,
}: {
  params: Promise<{ city: string; society: string }>;
}) {
  const { society: societySlug } = await params;

  let name = "Verified housing society";
  let city = "Pakistan";
  let tierLabel = "";
  let startingFrom: number | null = null;

  try {
    const society = await getApi().society.getBySlug({ slug: societySlug });
    name = society.name;
    city = society.city;
    tierLabel = VERIFICATION_TIER_META[society.verificationTier].label;
    const totals = society.categories.map(
      (c) => priceToNumber(c.pricePerSqft) * c.sizeSqft,
    );
    startingFrom = totals.length ? Math.round(Math.min(...totals)) : null;
  } catch {
    // Fall back to the generic branded card on any load failure.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_MID} 100%)`,
          color: INVERSE,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: ACCENT,
            }}
          />
          <span style={{ fontSize: "30px", fontWeight: 700 }}>
            {`${SITE.name}.pk`}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {tierLabel ? (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "8px 18px",
                borderRadius: "9999px",
                background: ACCENT,
                color: NAVY,
                fontSize: "24px",
                fontWeight: 600,
              }}
            >
              {tierLabel}
            </div>
          ) : null}
          <div style={{ fontSize: "68px", fontWeight: 800, lineHeight: 1.05 }}>
            {name}
          </div>
          <div style={{ fontSize: "34px", color: MUTED }}>
            {`${city}, Pakistan`}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <span style={{ fontSize: "28px", color: MUTED }}>
            {startingFrom !== null
              ? `Plots from ${formatPKR(startingFrom)}`
              : SITE.tagline}
          </span>
          <span style={{ fontSize: "24px", color: MUTED }}>
            Verified · Escrow protected
          </span>
        </div>
      </div>
    ),
    size,
  );
}

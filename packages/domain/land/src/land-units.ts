/** Punjab standard: 1 kanal = 5445 sq ft (20 marla). */
export const SQFT_PER_KANAL = 5445;

/** 1 acre = 8 kanal in Punjab. */
export const KANAL_PER_ACRE = 8;

/** Square metres per kanal (derived from sq ft). */
export const SQ_METERS_PER_KANAL = SQFT_PER_KANAL * 0.092903;

/**
 * Converts square metres to kanal using the Punjab land standard.
 * Returns null for non-finite or negative inputs.
 */
export function sqMetersToKanal(sqMeters: number): number | null {
  if (!Number.isFinite(sqMeters) || sqMeters < 0) return null;
  return sqMeters / SQ_METERS_PER_KANAL;
}

/**
 * Converts square feet to kanal.
 */
export function sqFtToKanal(sqFt: number): number | null {
  if (!Number.isFinite(sqFt) || sqFt < 0) return null;
  return sqFt / SQFT_PER_KANAL;
}

/**
 * Formats kanal for display with optional acre equivalent.
 * e.g. "1,250 kanal (~156 acres)"
 */
export function formatLandKanal(kanal: number): string {
  if (!Number.isFinite(kanal) || kanal < 0) return "—";
  const rounded = Math.round(kanal * 10) / 10;
  const formatted = rounded.toLocaleString("en-PK", {
    maximumFractionDigits: 1,
  });
  const acres = kanal / KANAL_PER_ACRE;
  if (acres >= 1) {
    const acresFormatted = Math.round(acres).toLocaleString("en-PK");
    return `${formatted} kanal (~${acresFormatted} acres)`;
  }
  return `${formatted} kanal`;
}

/**
 * Parses a decimal string kanal value to a number for display math.
 */
export function parseKanalString(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

/**
 * Computes developed land as a percentage of total when both are known.
 */
export function developedLandPct(
  totalKanal: number,
  developedKanal: number,
): number | null {
  if (totalKanal <= 0 || developedKanal < 0) return null;
  return Math.min(100, Math.round((developedKanal / totalKanal) * 100));
}

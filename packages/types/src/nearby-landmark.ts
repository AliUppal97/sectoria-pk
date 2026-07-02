import { z } from "zod";
import { decimalStringSchema, idSchema } from "./common.js";

/**
 * Category of a nearby landmark for connectivity context.
 * Admin-entered values only — no Places API (ADR-008).
 * Mirrors the Prisma `LandmarkCategory` enum.
 */
export const LandmarkCategory = {
  AIRPORT: "AIRPORT",
  HOSPITAL: "HOSPITAL",
  SCHOOL: "SCHOOL",
  UNIVERSITY: "UNIVERSITY",
  MARKET: "MARKET",
  MOSQUE: "MOSQUE",
  HIGHWAY: "HIGHWAY",
  INTERCHANGE: "INTERCHANGE",
  LANDMARK: "LANDMARK",
} as const;
export type LandmarkCategory =
  (typeof LandmarkCategory)[keyof typeof LandmarkCategory];
export const landmarkCategorySchema = z.nativeEnum(LandmarkCategory);

/** A curated nearby landmark with optional distance and drive-time. */
export const nearbyLandmarkSchema = z.object({
  id: idSchema,
  societyId: idSchema,
  name: z.string().min(1),
  category: landmarkCategorySchema,
  distanceKm: decimalStringSchema.nullable().optional(),
  driveTimeMins: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().nonnegative(),
});
export type NearbyLandmark = z.infer<typeof nearbyLandmarkSchema>;

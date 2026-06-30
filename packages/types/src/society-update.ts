import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common.js";

/**
 * Category of a society news/update item shown on the public profile.
 * Used for NOC milestones, license grants, possession news, etc.
 */
export const SocietyUpdateCategory = {
  NOC: "NOC",
  LICENSE: "LICENSE",
  POSSESSION: "POSSESSION",
  BOOKING: "BOOKING",
  DEVELOPMENT: "DEVELOPMENT",
  GENERAL: "GENERAL",
} as const;
export type SocietyUpdateCategory =
  (typeof SocietyUpdateCategory)[keyof typeof SocietyUpdateCategory];
export const societyUpdateCategorySchema = z.nativeEnum(SocietyUpdateCategory);

/** Society-level booking availability for buyers. */
export const SocietyBookingStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  UPCOMING: "UPCOMING",
} as const;
export type SocietyBookingStatus =
  (typeof SocietyBookingStatus)[keyof typeof SocietyBookingStatus];
export const societyBookingStatusSchema = z.nativeEnum(SocietyBookingStatus);

/** GeoJSON Polygon or MultiPolygon stored on Society.boundaryGeoJson. */
export const geoJsonBoundarySchema = z.object({
  type: z.enum(["Polygon", "MultiPolygon"]),
  coordinates: z.array(z.unknown()),
});

export const societyUpdateSchema = z.object({
  id: idSchema,
  societyId: idSchema,
  title: z.string().min(1),
  body: z.string().min(1),
  category: societyUpdateCategorySchema,
  publishedAt: isoDateTimeSchema,
  isPublished: z.boolean(),
  createdAt: isoDateTimeSchema,
});
export type SocietyUpdate = z.infer<typeof societyUpdateSchema>;

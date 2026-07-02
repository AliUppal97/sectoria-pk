import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common.js";

/**
 * Kind of visual media attached to a society profile.
 * Mirrors the Prisma `SocietyMediaKind` enum.
 */
export const SocietyMediaKind = {
  HERO: "HERO",
  GALLERY: "GALLERY",
  PROGRESS: "PROGRESS",
  FLOORPLAN: "FLOORPLAN",
} as const;
export type SocietyMediaKind =
  (typeof SocietyMediaKind)[keyof typeof SocietyMediaKind];
export const societyMediaKindSchema = z.nativeEnum(SocietyMediaKind);

/** A gallery, hero, progress, or floorplan image for a society profile. */
export const societyMediaSchema = z.object({
  id: idSchema,
  societyId: idSchema,
  kind: societyMediaKindSchema,
  /** Object-storage key; resolved to a URL at read time. */
  storageKey: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().nullable().optional(),
  /** For PROGRESS media — used for month/year grouping and ordering. */
  capturedAt: isoDateTimeSchema.nullable().optional(),
  sortOrder: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  createdAt: isoDateTimeSchema,
});
export type SocietyMedia = z.infer<typeof societyMediaSchema>;

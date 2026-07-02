import { z } from "zod";
import { idSchema } from "./common.js";

/** A rich amenity card (icon/image + title + description) on a society profile. */
export const amenityFeatureSchema = z.object({
  id: idSchema,
  societyId: idSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  /** Lucide icon name from the design-system icon set. */
  icon: z.string().nullable().optional(),
  /** Optional object-storage image key. */
  imageKey: z.string().nullable().optional(),
  sortOrder: z.number().int().nonnegative(),
});
export type AmenityFeature = z.infer<typeof amenityFeatureSchema>;

/** A stat highlight ("80,000 kanal", "100+ parks") shown near the hero. */
export const societyHighlightSchema = z.object({
  id: idSchema,
  societyId: idSchema,
  label: z.string().min(1),
  value: z.string().min(1),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().nonnegative(),
});
export type SocietyHighlight = z.infer<typeof societyHighlightSchema>;

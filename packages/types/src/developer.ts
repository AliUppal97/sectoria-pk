import { z } from "zod";
import { idSchema, isoDateTimeSchema, slugSchema } from "./common.js";

/** A housing-society developer / builder — platform-curated trust data. */
export const developerSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  name: z.string().min(1),
  description: z.string(),
  /** Object-storage key for the developer logo. */
  logoKey: z.string().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  foundedYear: z.number().int().min(1800).max(2100).nullable().optional(),
  createdAt: isoDateTimeSchema,
});
export type Developer = z.infer<typeof developerSchema>;

/** A past project in a developer's track record. */
export const developerProjectSchema = z.object({
  id: idSchema,
  developerId: idSchema,
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  imageKey: z.string().nullable().optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  city: z.string().nullable().optional(),
  sortOrder: z.number().int().nonnegative(),
});
export type DeveloperProject = z.infer<typeof developerProjectSchema>;

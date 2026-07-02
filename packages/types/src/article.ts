import { z } from "zod";
import { idSchema, isoDateTimeSchema, slugSchema } from "./common.js";

/** An editorial / SEO article, optionally tagged to a society or developer. */
export const articleSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  title: z.string().min(1),
  excerpt: z.string().min(1),
  /** Markdown body — rendered server-side with a sanitizer. */
  body: z.string().min(1),
  coverKey: z.string().nullable().optional(),
  authorName: z.string().min(1),
  publishedAt: isoDateTimeSchema.nullable().optional(),
  isPublished: z.boolean(),
  societyId: idSchema.nullable().optional(),
  developerId: idSchema.nullable().optional(),
  createdAt: isoDateTimeSchema,
});
export type Article = z.infer<typeof articleSchema>;

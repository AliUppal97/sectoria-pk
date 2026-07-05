import { z } from "zod";
import { idSchema, isoDateTimeSchema, slugSchema } from "./common.js";
import { societyMediaKindSchema } from "./society-media.js";
import { societyDocumentKindSchema } from "./society-document.js";
import { landmarkCategorySchema } from "./nearby-landmark.js";
import { milestoneStatusSchema } from "./society-milestone.js";

/**
 * Input contracts for society profile v2 routers (M1–M6, M8). Consumed by
 * `@sectoria/api-client` procedures — never trust role/identity from input.
 */

/** Shared reorder payload: ordered ids become sortOrder 0..n-1. */
export const reorderByIdsInputSchema = z.object({
  societyId: idSchema,
  orderedIds: z.array(idSchema).min(1),
});
export type ReorderByIdsInput = z.infer<typeof reorderByIdsInputSchema>;

/** List media for a society profile or admin console. */
export const societyMediaListInputSchema = z.object({
  societyId: idSchema,
});
export type SocietyMediaListInput = z.infer<typeof societyMediaListInputSchema>;

export const societyMediaCreateInputSchema = z.object({
  societyId: idSchema,
  kind: societyMediaKindSchema,
  storageKey: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().nullable().optional(),
  capturedAt: isoDateTimeSchema.nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
});
export type SocietyMediaCreateInput = z.infer<typeof societyMediaCreateInputSchema>;

export const societyMediaUpdateInputSchema = z.object({
  mediaId: idSchema,
  data: z.object({
    kind: societyMediaKindSchema.optional(),
    storageKey: z.string().min(1).optional(),
    alt: z.string().min(1).optional(),
    caption: z.string().nullable().optional(),
    capturedAt: isoDateTimeSchema.nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
  }),
});
export type SocietyMediaUpdateInput = z.infer<typeof societyMediaUpdateInputSchema>;

export const societyMediaDeleteInputSchema = z.object({
  mediaId: idSchema,
});
export type SocietyMediaDeleteInput = z.infer<typeof societyMediaDeleteInputSchema>;

/** Allowed MIME types for society documents (pdf/jpg/png). */
export const societyDocumentContentTypeSchema = z.enum([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
export type SocietyDocumentContentType = z.infer<
  typeof societyDocumentContentTypeSchema
>;

/** Maximum document size in bytes (10 MiB). */
export const SOCIETY_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const societyDocumentListInputSchema = z.object({
  societyId: idSchema,
});
export type SocietyDocumentListInput = z.infer<typeof societyDocumentListInputSchema>;

export const societyDocumentCreateInputSchema = z.object({
  societyId: idSchema,
  kind: societyDocumentKindSchema,
  title: z.string().min(1),
  storageKey: z.string().min(1),
  fileSize: z.number().int().positive().max(SOCIETY_DOCUMENT_MAX_BYTES),
  contentType: societyDocumentContentTypeSchema,
  isPublic: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type SocietyDocumentCreateInput = z.infer<
  typeof societyDocumentCreateInputSchema
>;

export const societyDocumentUpdateInputSchema = z.object({
  documentId: idSchema,
  data: z.object({
    kind: societyDocumentKindSchema.optional(),
    title: z.string().min(1).optional(),
    storageKey: z.string().min(1).optional(),
    fileSize: z
      .number()
      .int()
      .positive()
      .max(SOCIETY_DOCUMENT_MAX_BYTES)
      .optional(),
    contentType: societyDocumentContentTypeSchema.optional(),
    isPublic: z.boolean().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  }),
});
export type SocietyDocumentUpdateInput = z.infer<
  typeof societyDocumentUpdateInputSchema
>;

export const societyDocumentDeleteInputSchema = z.object({
  documentId: idSchema,
});
export type SocietyDocumentDeleteInput = z.infer<
  typeof societyDocumentDeleteInputSchema
>;

export const amenityFeatureCreateInputSchema = z.object({
  societyId: idSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().nullable().optional(),
  imageKey: z.string().nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type AmenityFeatureCreateInput = z.infer<
  typeof amenityFeatureCreateInputSchema
>;

export const amenityFeatureUpdateInputSchema = z.object({
  amenityId: idSchema,
  data: z.object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    icon: z.string().nullable().optional(),
    imageKey: z.string().nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  }),
});
export type AmenityFeatureUpdateInput = z.infer<
  typeof amenityFeatureUpdateInputSchema
>;

export const amenityFeatureDeleteInputSchema = z.object({
  amenityId: idSchema,
});
export type AmenityFeatureDeleteInput = z.infer<
  typeof amenityFeatureDeleteInputSchema
>;

export const societyHighlightCreateInputSchema = z.object({
  societyId: idSchema,
  label: z.string().min(1),
  value: z.string().min(1),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type SocietyHighlightCreateInput = z.infer<
  typeof societyHighlightCreateInputSchema
>;

export const societyHighlightUpdateInputSchema = z.object({
  highlightId: idSchema,
  data: z.object({
    label: z.string().min(1).optional(),
    value: z.string().min(1).optional(),
    icon: z.string().nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  }),
});
export type SocietyHighlightUpdateInput = z.infer<
  typeof societyHighlightUpdateInputSchema
>;

export const societyHighlightDeleteInputSchema = z.object({
  highlightId: idSchema,
});
export type SocietyHighlightDeleteInput = z.infer<
  typeof societyHighlightDeleteInputSchema
>;

export const nearbyLandmarkCreateInputSchema = z.object({
  societyId: idSchema,
  name: z.string().min(1),
  category: landmarkCategorySchema,
  distanceKm: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/)
    .nullable()
    .optional(),
  driveTimeMins: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type NearbyLandmarkCreateInput = z.infer<
  typeof nearbyLandmarkCreateInputSchema
>;

export const nearbyLandmarkUpdateInputSchema = z.object({
  landmarkId: idSchema,
  data: z.object({
    name: z.string().min(1).optional(),
    category: landmarkCategorySchema.optional(),
    distanceKm: z
      .string()
      .regex(/^-?\d+(\.\d+)?$/)
      .nullable()
      .optional(),
    driveTimeMins: z.number().int().positive().nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  }),
});
export type NearbyLandmarkUpdateInput = z.infer<
  typeof nearbyLandmarkUpdateInputSchema
>;

export const nearbyLandmarkDeleteInputSchema = z.object({
  landmarkId: idSchema,
});
export type NearbyLandmarkDeleteInput = z.infer<
  typeof nearbyLandmarkDeleteInputSchema
>;

export const developerGetBySlugInputSchema = z.object({
  slug: slugSchema,
});
export type DeveloperGetBySlugInput = z.infer<typeof developerGetBySlugInputSchema>;

export const developerCreateInputSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  logoKey: z.string().nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
  foundedYear: z.number().int().min(1800).max(2100).nullable().optional(),
});
export type DeveloperCreateInput = z.infer<typeof developerCreateInputSchema>;

export const developerUpdateInputSchema = z.object({
  developerId: idSchema,
  data: z.object({
    slug: slugSchema.optional(),
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    logoKey: z.string().nullable().optional(),
    websiteUrl: z.string().url().nullable().optional(),
    foundedYear: z.number().int().min(1800).max(2100).nullable().optional(),
  }),
});
export type DeveloperUpdateInput = z.infer<typeof developerUpdateInputSchema>;

export const developerProjectCreateInputSchema = z.object({
  developerId: idSchema,
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  imageKey: z.string().nullable().optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  city: z.string().nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type DeveloperProjectCreateInput = z.infer<
  typeof developerProjectCreateInputSchema
>;

export const developerProjectUpdateInputSchema = z.object({
  projectId: idSchema,
  data: z.object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    imageKey: z.string().nullable().optional(),
    year: z.number().int().min(1900).max(2100).nullable().optional(),
    city: z.string().nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  }),
});
export type DeveloperProjectUpdateInput = z.infer<
  typeof developerProjectUpdateInputSchema
>;

export const developerProjectDeleteInputSchema = z.object({
  projectId: idSchema,
});
export type DeveloperProjectDeleteInput = z.infer<
  typeof developerProjectDeleteInputSchema
>;

export const societyMilestoneCreateInputSchema = z.object({
  societyId: idSchema,
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  occurredOn: isoDateTimeSchema,
  status: milestoneStatusSchema.optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type SocietyMilestoneCreateInput = z.infer<
  typeof societyMilestoneCreateInputSchema
>;

export const societyMilestoneUpdateInputSchema = z.object({
  milestoneId: idSchema,
  data: z.object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    occurredOn: isoDateTimeSchema.optional(),
    status: milestoneStatusSchema.optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  }),
});
export type SocietyMilestoneUpdateInput = z.infer<
  typeof societyMilestoneUpdateInputSchema
>;

export const societyMilestoneDeleteInputSchema = z.object({
  milestoneId: idSchema,
});
export type SocietyMilestoneDeleteInput = z.infer<
  typeof societyMilestoneDeleteInputSchema
>;

export const articleListInputSchema = z.object({
  societyId: idSchema.optional(),
  developerId: idSchema.optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
export type ArticleListInput = z.infer<typeof articleListInputSchema>;

export const articleGetBySlugInputSchema = z.object({
  slug: slugSchema,
});
export type ArticleGetBySlugInput = z.infer<typeof articleGetBySlugInputSchema>;

export const articleCreateInputSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1),
  excerpt: z.string().min(1),
  body: z.string().min(1),
  coverKey: z.string().nullable().optional(),
  authorName: z.string().min(1),
  publishedAt: isoDateTimeSchema.nullable().optional(),
  isPublished: z.boolean().optional(),
  societyId: idSchema.nullable().optional(),
  developerId: idSchema.nullable().optional(),
});
export type ArticleCreateInput = z.infer<typeof articleCreateInputSchema>;

export const articleUpdateInputSchema = z.object({
  articleId: idSchema,
  data: z.object({
    slug: slugSchema.optional(),
    title: z.string().min(1).optional(),
    excerpt: z.string().min(1).optional(),
    body: z.string().min(1).optional(),
    coverKey: z.string().nullable().optional(),
    authorName: z.string().min(1).optional(),
    publishedAt: isoDateTimeSchema.nullable().optional(),
    isPublished: z.boolean().optional(),
    societyId: idSchema.nullable().optional(),
    developerId: idSchema.nullable().optional(),
  }),
});
export type ArticleUpdateInput = z.infer<typeof articleUpdateInputSchema>;

export const articleDeleteInputSchema = z.object({
  articleId: idSchema,
});
export type ArticleDeleteInput = z.infer<typeof articleDeleteInputSchema>;

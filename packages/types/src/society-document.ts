import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common.js";

/**
 * Kind of downloadable document on a society profile.
 * LOP/NOC are compliance artifacts and may be marked non-public.
 * Mirrors the Prisma `SocietyDocumentKind` enum.
 */
export const SocietyDocumentKind = {
  MASTER_PLAN: "MASTER_PLAN",
  BROCHURE: "BROCHURE",
  PAYMENT_PLAN: "PAYMENT_PLAN",
  LOP: "LOP",
  NOC: "NOC",
  OTHER: "OTHER",
} as const;
export type SocietyDocumentKind =
  (typeof SocietyDocumentKind)[keyof typeof SocietyDocumentKind];
export const societyDocumentKindSchema = z.nativeEnum(SocietyDocumentKind);

/** A downloadable PDF or image document for a society profile. */
export const societyDocumentSchema = z.object({
  id: idSchema,
  societyId: idSchema,
  kind: societyDocumentKindSchema,
  title: z.string().min(1),
  /** Object-storage key; resolved to a short-lived signed URL at read time. */
  storageKey: z.string().min(1),
  /** File size in bytes, shown in the UI before download. */
  fileSize: z.number().int().nonnegative(),
  /** MIME type — validated against an allow-list on upload. */
  contentType: z.string().min(1),
  /** When false, URL minting requires an authenticated role check. */
  isPublic: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  createdAt: isoDateTimeSchema,
});
export type SocietyDocument = z.infer<typeof societyDocumentSchema>;

import { z } from "zod";
import { idSchema, slugSchema } from "./common.js";
import { societyPublishStatusSchema } from "./society.js";
import { isKnownAuthority, isKnownCitySlug } from "./reference-data.js";
import { plotTypeSchema } from "./inventory-category.js";
import { societyBookingStatusSchema } from "./society-update.js";

/**
 * Input contracts for society onboarding & lifecycle (M0). Society creation is
 * platform/ops work — never self-service — so these are consumed by
 * `opsProcedure`/`superAdminProcedure` in `@sectoria/api-client`, never a buyer
 * path (`concierge-model.mdc`, `m0-onboarding-and-scale.md`).
 */

/** A curated-reference-validated authority code (e.g. "LDA"). */
export const authorityCodeSchema = z
  .string()
  .min(1)
  .refine(isKnownAuthority, {
    message:
      "Unknown authority. Use a curated REGULATORY_AUTHORITIES code (e.g. CDA, LDA, RDA).",
  });

/** A curated-reference-validated city slug (e.g. "lahore"). */
export const citySlugSchema = slugSchema.refine(isKnownCitySlug, {
  message:
    "Unknown city. Use a curated PAKISTAN_CITIES slug (e.g. lahore, islamabad).",
});

/**
 * The minimal identity set to bring a society into existence as a `DRAFT`.
 * Everything else (description, media, compliance refs) is filled in later via
 * the portal/admin editors. `city` is derived from `citySlug` server-side, so it
 * is not accepted here — this prevents an inconsistent city/citySlug pair.
 */
export const societyCreateInputSchema = z.object({
  name: z.string().trim().min(1, "A society name is required").max(160),
  slug: slugSchema,
  citySlug: citySlugSchema,
  authority: authorityCodeSchema,
});
export type SocietyCreateInput = z.infer<typeof societyCreateInputSchema>;

/** Moves a society between `DRAFT`/`PUBLISHED`/`ARCHIVED` (publish is gated). */
export const societySetPublishStatusInputSchema = z.object({
  societyId: idSchema,
  status: societyPublishStatusSchema,
});
export type SocietySetPublishStatusInput = z.infer<
  typeof societySetPublishStatusInputSchema
>;

/**
 * Links a `SOCIETY_ADMIN` user to a society (society-managed), or clears all
 * linked admins when `userId` is null (platform-managed — ops maintain it).
 */
export const societyAssignAdminInputSchema = z.object({
  societyId: idSchema,
  userId: idSchema.nullable(),
});
export type SocietyAssignAdminInput = z.infer<
  typeof societyAssignAdminInputSchema
>;

/**
 * Bulk import of base society records (M0.5). Idempotent upsert keyed on `slug`;
 * every row always lands in `DRAFT`. `dryRun` validates without writing.
 */
export const societyImportBatchInputSchema = z.object({
  dryRun: z.boolean().default(false),
  rows: z
    .array(societyCreateInputSchema)
    .min(1, "Provide at least one society row")
    .max(500, "Import at most 500 societies per batch"),
});
export type SocietyImportBatchInput = z.infer<
  typeof societyImportBatchInputSchema
>;

/** Per-row outcome of a bulk import. */
export const societyImportRowResultSchema = z.object({
  slug: z.string(),
  outcome: z.enum(["created", "updated", "skipped", "error"]),
  message: z.string().optional(),
});
export type SocietyImportRowResult = z.infer<
  typeof societyImportRowResultSchema
>;

/**
 * Directory sort options (ADR-010 / V2). `ratingDesc` is deferred until a
 * maintained aggregate exists — do not add it here.
 */
export const societyListSortSchema = z.enum([
  "name",
  "priceAsc",
  "priceDesc",
]);
export type SocietyListSort = z.infer<typeof societyListSortSchema>;

/** Max PKR bound accepted on directory price filters (1 trillion). */
const PRICE_FILTER_MAX_PKR = 1_000_000_000_000;

/**
 * Cursor-paginated directory listing input (M0.7 + H1). Filters and search are
 * index-backed on the server; there is no in-memory full-table scan.
 * Price uses denormalized `Society.startingPricePkr` (ADR-010).
 */
export const societyListSummariesInputSchema = z
  .object({
    limit: z.number().int().min(1).max(60).default(24),
    cursor: idSchema.nullish(),
    citySlug: slugSchema.optional(),
    authority: z.string().min(1).optional(),
    verificationTier: z
      .enum(["PENDING", "VERIFIED", "HSMS_LINKED"])
      .optional(),
    /** Free-text name/city search; name is trigram-backed, city is contains. */
    search: z.string().trim().min(1).max(120).optional(),
    plotType: plotTypeSchema.optional(),
    sizeLabel: z.string().trim().min(1).max(40).optional(),
    priceMinPkr: z
      .number()
      .int()
      .nonnegative()
      .max(PRICE_FILTER_MAX_PKR)
      .optional(),
    priceMaxPkr: z
      .number()
      .int()
      .nonnegative()
      .max(PRICE_FILTER_MAX_PKR)
      .optional(),
    developmentStage: z.string().trim().min(1).max(80).optional(),
    bookingStatus: societyBookingStatusSchema.optional(),
    sort: societyListSortSchema.default("name"),
  })
  .superRefine((value, ctx) => {
    if (
      value.priceMinPkr !== undefined &&
      value.priceMaxPkr !== undefined &&
      value.priceMinPkr > value.priceMaxPkr
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "priceMinPkr must be less than or equal to priceMaxPkr.",
        path: ["priceMinPkr"],
      });
    }
  });
export type SocietyListSummariesInput = z.infer<
  typeof societyListSummariesInputSchema
>;

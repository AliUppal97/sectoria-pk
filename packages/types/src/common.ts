import { z } from "zod";

/**
 * Shared scalar schemas used across every domain entity. These are the
 * lowest-level building blocks — branded so that, for example, a raw
 * `string` can never be passed where a validated `Cnic` is expected,
 * catching whole classes of mistakes at compile time.
 *
 * Domain vocabulary used here:
 * - `cnic` — Computerized National Identity Card number (13 digits).
 * - `ntn`  — National Tax Number issued by the FBR.
 */

/**
 * Entity identifier. Prisma issues `cuid` values by default, but we keep
 * this permissive (any non-empty string) so seed data, test fixtures, and
 * a future switch to a different id strategy don't all require a schema
 * change. Treat it as an opaque token, never parse meaning out of it.
 */
export const idSchema = z.string().min(1).brand<"Id">();
export type Id = z.infer<typeof idSchema>;

/**
 * A monetary amount expressed as a whole number of **Pakistani rupees** —
 * the single currency unit used everywhere in this codebase. Paisa are no
 * longer in circulation, so the rupee is the smallest real unit and a plain
 * integer represents money exactly: no paisa sub-unit, no float (binary
 * floating point cannot represent decimal currency exactly, and tax/escrow
 * math must reconcile to the rupee).
 *
 * Genuinely fractional values (a price-per-sqft, a percentage rate) are NOT
 * `PkrAmount` — they use {@link decimalStringSchema}. A `PkrAmount` is only
 * ever a settled, whole-rupee figure.
 */
export const pkrAmountSchema = z.number().int().nonnegative().brand<"PkrAmount">();
export type PkrAmount = z.infer<typeof pkrAmountSchema>;

/**
 * A decimal number carried as a string to preserve exact precision (e.g.
 * a price-per-sqft or a percentage like `"3.5"`). Used wherever Prisma
 * models a `Decimal` column — JSON/`number` would silently lose precision.
 */
export const decimalStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, "Must be a decimal number represented as a string")
  .brand<"DecimalString">();
export type DecimalString = z.infer<typeof decimalStringSchema>;

/**
 * Pakistani CNIC in canonical hyphenated form, e.g. `35202-1234567-1`
 * (5-digit area + 7-digit serial + 1 check digit). Raw, unencrypted CNICs
 * never get persisted — see `security.mdc` and `packages/database/encryption`.
 */
export const cnicSchema = z
  .string()
  .regex(/^\d{5}-\d{7}-\d$/, "CNIC must be in the format XXXXX-XXXXXXX-X")
  .brand<"Cnic">();
export type Cnic = z.infer<typeof cnicSchema>;

/**
 * FBR National Tax Number — 7 digits, optionally followed by a single
 * hyphenated check digit (e.g. `1234567` or `1234567-8`).
 */
export const ntnSchema = z
  .string()
  .regex(/^\d{7}(-\d)?$/, "NTN must be 7 digits, optionally with a check digit")
  .brand<"Ntn">();
export type Ntn = z.infer<typeof ntnSchema>;

/**
 * URL-safe slug for SEO-friendly routes (lowercase, hyphen-separated),
 * e.g. `phase-2-block-c-5-marla-residential`.
 */
export const slugSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase alphanumeric words separated by single hyphens",
  )
  .brand<"Slug">();
export type Slug = z.infer<typeof slugSchema>;

/**
 * An ISO 8601 date-time string (e.g. `2026-06-27T00:00:00.000Z`). Every
 * timestamp crossing a boundary is an ISO string — never a `Date` object
 * (not JSON-serializable) or a locale-dependent format.
 */
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export type IsoDateTime = z.infer<typeof isoDateTimeSchema>;

/** Geographic coordinate pair, used for society map placement. */
export const latitudeSchema = z.number().min(-90).max(90);
export const longitudeSchema = z.number().min(-180).max(180);

/**
 * Standard error payload shape returned across the entire API surface so
 * a consumer never has to guess the error format per-endpoint.
 * See `json-and-config-conventions.mdc`.
 */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

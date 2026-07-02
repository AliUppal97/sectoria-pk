/**
 * Profile completeness & publish gate (M0.4).
 *
 * A pure, dependency-free helper: it derives how complete a society profile is
 * (0–100) and which required fields are still missing. It is used in two places
 * with one source of truth:
 *  - the **publish gate** — a society cannot move to `PUBLISHED` while any
 *    *required* field is missing (identity + coordinates + LOP/NOC + hero image);
 *  - the **admin/portal display** — the score and the missing list are surfaced
 *    read-only so ops/society admins know what is left to complete.
 *
 * No I/O, no clock, no framework — same input always yields the same result.
 */

/** The subset of society fields completeness is derived from. */
export interface SocietyCompletenessInput {
  readonly name?: string | null;
  readonly slug?: string | null;
  readonly citySlug?: string | null;
  readonly authority?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly lopReferenceNo?: string | null;
  readonly nocReferenceNo?: string | null;
  readonly heroImageUrl?: string | null;
  readonly description?: string | null;
  readonly amenities?: readonly string[] | null;
  readonly developmentStage?: string | null;
  readonly addressLine?: string | null;
}

/** The result of a completeness check. */
export interface SocietyCompleteness {
  /** Overall completeness across required + recommended fields, 0–100. */
  readonly score: number;
  /** Human-readable labels of the *required* fields still missing. */
  readonly missing: string[];
  /** True when every required (publish-gating) field is present. */
  readonly isPublishable: boolean;
}

interface FieldCheck {
  readonly label: string;
  readonly present: (society: SocietyCompletenessInput) => boolean;
}

const hasText = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.trim().length > 0;

const hasNumber = (value: number | null | undefined): boolean =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Required fields — a society cannot be published until all are present. This is
 * the "at minimum" set from `m0-onboarding-and-scale.md` §M0.4.
 */
const REQUIRED_FIELDS: readonly FieldCheck[] = [
  { label: "Society name", present: (s) => hasText(s.name) },
  { label: "URL slug", present: (s) => hasText(s.slug) },
  { label: "City", present: (s) => hasText(s.citySlug) },
  { label: "Development authority", present: (s) => hasText(s.authority) },
  {
    label: "Map location (latitude & longitude)",
    present: (s) => hasNumber(s.latitude) && hasNumber(s.longitude),
  },
  { label: "LOP reference number", present: (s) => hasText(s.lopReferenceNo) },
  { label: "NOC reference number", present: (s) => hasText(s.nocReferenceNo) },
  { label: "Hero image", present: (s) => hasText(s.heroImageUrl) },
];

/**
 * Recommended fields — they raise the completeness score and richness of the
 * profile but do not block publishing.
 */
const RECOMMENDED_FIELDS: readonly FieldCheck[] = [
  { label: "Description", present: (s) => hasText(s.description) },
  {
    label: "Amenities",
    present: (s) => Array.isArray(s.amenities) && s.amenities.length > 0,
  },
  { label: "Development stage", present: (s) => hasText(s.developmentStage) },
  { label: "Address", present: (s) => hasText(s.addressLine) },
];

/**
 * Computes a society's profile completeness and publish-readiness.
 *
 * @param society - The society fields to evaluate (a Prisma row or a DTO).
 * @returns The completeness score, the missing required-field labels, and
 *   whether the society passes the publish gate.
 */
export function calculateSocietyCompleteness(
  society: SocietyCompletenessInput,
): SocietyCompleteness {
  const allFields = [...REQUIRED_FIELDS, ...RECOMMENDED_FIELDS];
  const satisfied = allFields.filter((field) => field.present(society)).length;
  const score = Math.round((satisfied / allFields.length) * 100);

  const missing = REQUIRED_FIELDS.filter(
    (field) => !field.present(society),
  ).map((field) => field.label);

  return { score, missing, isPublishable: missing.length === 0 };
}

/**
 * Curated reference sets for society onboarding (M0.6).
 *
 * To keep filters, slugs, and facets consistent across thousands of societies,
 * `citySlug` and `authority` are validated against these curated constants on
 * create/import — free-text values are rejected unless they match (or are added
 * here). Promote to `City` / `RegulatoryAuthority` tables later if they ever need
 * their own metadata; curated constants suffice initially (`000-core.mdc` —
 * reuse, smallest correct diff).
 *
 * Domain vocabulary:
 * - `lda`/`cda`/`rda`/… — provincial or federal development authorities that
 *   approve layout plans (LOP) and issue no-objection certificates (NOC).
 */

/** A city Sectoria operates in: `slug` powers URLs/filters, `label` is display. */
export interface CityReference {
  readonly slug: string;
  readonly label: string;
}

/**
 * A regulatory/development authority. `code` is the short form stored on
 * `Society.authority` (e.g. "LDA") and used by facets/filters; `label` is the
 * full human-readable name.
 */
export interface AuthorityReference {
  readonly code: string;
  readonly label: string;
}

/**
 * Major Pakistani cities with active or planned housing societies. Ordered
 * roughly by market size. `slug` must be a valid {@link slugSchema} value.
 */
export const PAKISTAN_CITIES = [
  { slug: "islamabad", label: "Islamabad" },
  { slug: "rawalpindi", label: "Rawalpindi" },
  { slug: "lahore", label: "Lahore" },
  { slug: "karachi", label: "Karachi" },
  { slug: "faisalabad", label: "Faisalabad" },
  { slug: "multan", label: "Multan" },
  { slug: "gujranwala", label: "Gujranwala" },
  { slug: "peshawar", label: "Peshawar" },
  { slug: "quetta", label: "Quetta" },
  { slug: "sialkot", label: "Sialkot" },
  { slug: "sargodha", label: "Sargodha" },
  { slug: "bahawalpur", label: "Bahawalpur" },
  { slug: "hyderabad", label: "Hyderabad" },
  { slug: "abbottabad", label: "Abbottabad" },
  { slug: "gwadar", label: "Gwadar" },
  { slug: "sahiwal", label: "Sahiwal" },
  { slug: "mardan", label: "Mardan" },
  { slug: "sukkur", label: "Sukkur" },
] as const satisfies readonly CityReference[];

/**
 * Development/regulatory authorities that approve and oversee housing schemes.
 * `code` matches the value stored on `Society.authority` (kept uppercase for
 * consistency with existing rows and the directory facet grouping).
 */
export const REGULATORY_AUTHORITIES = [
  { code: "CDA", label: "Capital Development Authority" },
  { code: "LDA", label: "Lahore Development Authority" },
  { code: "RDA", label: "Rawalpindi Development Authority" },
  { code: "FDA", label: "Faisalabad Development Authority" },
  { code: "GDA", label: "Gujranwala Development Authority" },
  { code: "MDA", label: "Multan Development Authority" },
  { code: "PHATA", label: "Punjab Housing & Town Planning Agency" },
  { code: "WDA", label: "Walled City / Water & Development Authority" },
  { code: "KDA", label: "Karachi Development Authority" },
  { code: "SBCA", label: "Sindh Building Control Authority" },
  { code: "PDA", label: "Peshawar Development Authority" },
  { code: "QDA", label: "Quetta Development Authority" },
  { code: "DHA", label: "Defence Housing Authority" },
  { code: "PHA", label: "Provincial Housing Authority" },
] as const satisfies readonly AuthorityReference[];

const CITY_SLUGS: ReadonlySet<string> = new Set(
  PAKISTAN_CITIES.map((city) => city.slug),
);
const AUTHORITY_CODES: ReadonlySet<string> = new Set(
  REGULATORY_AUTHORITIES.map((authority) => authority.code),
);

/** Whether `slug` is one of the curated {@link PAKISTAN_CITIES}. */
export function isKnownCitySlug(slug: string): boolean {
  return CITY_SLUGS.has(slug);
}

/** Whether `code` is one of the curated {@link REGULATORY_AUTHORITIES}. */
export function isKnownAuthority(code: string): boolean {
  return AUTHORITY_CODES.has(code);
}

/** The display label for a known city slug, or `undefined` if unknown. */
export function cityLabelForSlug(slug: string): string | undefined {
  return PAKISTAN_CITIES.find((city) => city.slug === slug)?.label;
}

/** A curated development-stage value shown in discovery filters (H1 / ADR-010). */
export interface DevelopmentStageReference {
  readonly value: string;
  readonly label: string;
}

/**
 * Common society development stages. Filter UI prefers this catalog; facets may
 * still return live `Society.developmentStage` strings (union in the UI).
 * Labels match seed-common strings where possible — V2 does not migrate free-text
 * rows (discovery-search §3.2).
 */
export const DEVELOPMENT_STAGES = [
  { value: "Planning", label: "Planning" },
  { value: "Under Development", label: "Under Development" },
  { value: "Possession Underway", label: "Possession Underway" },
] as const satisfies readonly DevelopmentStageReference[];

/** A curated plot size label for discovery filters (exact match on category). */
export interface PlotSizeLabelReference {
  readonly value: string;
  readonly label: string;
}

/**
 * Common residential plot size labels. Filter UI prefers this catalog; facets
 * may list live `InventoryCategory.sizeLabel` values (top N by count).
 */
export const COMMON_PLOT_SIZE_LABELS = [
  { value: "3 Marla", label: "3 Marla" },
  { value: "5 Marla", label: "5 Marla" },
  { value: "7 Marla", label: "7 Marla" },
  { value: "10 Marla", label: "10 Marla" },
  { value: "1 Kanal", label: "1 Kanal" },
  { value: "2 Kanal", label: "2 Kanal" },
] as const satisfies readonly PlotSizeLabelReference[];

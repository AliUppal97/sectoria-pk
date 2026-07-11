# D1 — Discovery Search & Rich Filters

Module spec for the shared society discovery experience used by the homepage hero and `/societies` directory.

- Foundations: [`foundations.md`](foundations.md)
- Index: [`../homepage-v2-spec.md`](../homepage-v2-spec.md)
- Playbook: [`../../homepage-v2-playbook.md`](../../homepage-v2-playbook.md)

---

## 1. Problem

Buyers cannot target societies from home. The directory has three selects (city, verification, authority) and **no search field**, even though `society.listSummaries` already accepts `search` (trigram-backed on `name`, plus `city` contains). Price, plot type, size, development stage, booking status, and sort are not filterable.

---

## 2. Product design

### 2.1 SocietyDiscoveryBar — anatomy

**Homepage (`mode=home`) — first-look slim bar:**

```
+------------------------------------------------------------------+
|  [ Search societies or cities…     ]  [City v]  [Filters] [Search]|
+------------------------------------------------------------------+
  City chips (homepage only, under bar; max 6):
  [Lahore 12] [Islamabad 8] [Karachi 5] …
```

**Directory (`mode=directory`) — full Tier A:**

```
+------------------------------------------------------------------+
|  [ Search… ]  [City v] [Budget v] [Type v]  [Filters]            |
+------------------------------------------------------------------+
```

| Surface | Inline (always visible) | Behind "Filters" |
|---|---|---|
| `mode=home` | **Search + City** + Search CTA (`size="lg"`) | Budget, plot type, **and** all Tier B |
| `mode=directory` | Search, City, Budget, Plot type | Tier B only |

**Visual hierarchy (home):** elevated card (`shadow-sm`, focus → `shadow-md`); search field min height 44–48px; Search is the sole filled primary in the hero.

**Desktop directory:** single horizontal bar; full Tier A inline; Tier B in a popover/sheet titled "More filters".

**Mobile (< md):** stacked — search full width; inline controls as a horizontal chip/select row; "Filters" opens a bottom sheet + Apply / Reset. Native `<select>` where Radix is unreliable on iOS (mirror existing `SocietyFilters` pattern).

**Submit / apply behavior (locked):**

| Surface | Search text | Inline selects | Filters sheet |
|---|---|---|---|
| **Directory** | Debounced `router.replace` (≥300ms) via `useDebouncedValue` | Auto-apply `router.replace` | Apply commits; Reset clears all params |
| **Homepage** | Composed locally until submit | Composed locally until submit | Included when user hits Search / Enter → `router.push('/societies?' + params)` |

Reset clears all discovery params.

**City chips (homepage only):** max **6**, `count > 0`, order by count desc; mobile horizontal scroll; city name primary, count muted secondary text; links to `/societies?citySlug=…`.

### 2.2 Typeahead (Session H4 — in-scope)

When `search` length ≥ 2 and focused:

| Group | Items |
|---|---|
| Societies | Up to 5: name, city, verification badge |
| Cities | Up to 3 matching facet cities / `PAKISTAN_CITIES` |

Keyboard: ↑↓, Enter selects, Esc closes. Clicking a society goes to profile (`/societies/[city]/[society]`); clicking a city sets `citySlug` and navigates to the directory with that param.

### 2.3 Budget presets (UI → URL)

| Chip label | `priceMinPkr` | `priceMaxPkr` |
|---|---|---|
| Under 50 lakh | — | `5000000` |
| 50 lakh – 1 crore | `5000000` | `10000000` |
| 1 – 2 crore | `10000000` | `20000000` |
| 2 – 5 crore | `20000000` | `50000000` |
| 5 crore+ | `50000000` | — |

Display with `formatPKR` in the sheet; chips use short market labels ("50 lakh", "1 crore"). Store raw PKR ints in the URL.

### 2.4 Copy

- Search placeholder: `Search societies or cities`
- Submit (homepage): `Search`
- Filters button: `Filters` with count badge when Tier B active
- Empty results (directory): `No societies match these filters` + `Reset filters` (already exists — keep)
- Public verification labels: `LOP + NOC verified`, `HSMS live-linked` — **never** offer "Verification pending" in the public bar

### 2.5 Public verification options (locked)

Public DiscoveryBar verification select options:

- Any verification (param absent)
- `VERIFIED`
- `HSMS_LINKED`

Do not render `PENDING` in the marketplace filter UI. Admin consoles may still filter by `PENDING`.

---

## 3. Data & API

### 3.1 Extend `societyListSummariesInputSchema`

File: `packages/types/src/society-onboarding.ts` (extend in place per `000-core.mdc`).

Add optional fields from foundations §3.2. Validate:

- `priceMinPkr` / `priceMaxPkr`: `z.number().int().nonnegative().max(1_000_000_000_000)`
- If both set and `min > max` → API `BAD_REQUEST`; URL parser **drops the pair** (no SSR crash)
- `plotType`: enum matching Prisma `PlotType`
- `sizeLabel`: `z.string().trim().min(1).max(40)`
- `developmentStage`: `z.string().trim().min(1).max(80)`
- `bookingStatus`: enum matching `SocietyBookingStatus`
- `sort`: `z.enum(['name', 'priceAsc', 'priceDesc']).default('name')` — **no `ratingDesc` in V2**
- `verificationTier`: API may still accept `PENDING` for ops; public UI never sends it

### 3.2 Reference catalogs (new in `packages/types`)

Add curated constants (same pattern as `PAKISTAN_CITIES` / `REGULATORY_AUTHORITIES`):

```ts
// Illustrative — exact labels must match seed-common strings where possible
export const DEVELOPMENT_STAGES = [
  { value: "Planning", label: "Planning" },
  { value: "Under Development", label: "Under Development" },
  { value: "Possession Underway", label: "Possession Underway" },
] as const;

export const COMMON_PLOT_SIZE_LABELS = [
  { value: "3 Marla", label: "3 Marla" },
  { value: "5 Marla", label: "5 Marla" },
  { value: "7 Marla", label: "7 Marla" },
  { value: "10 Marla", label: "10 Marla" },
  { value: "1 Kanal", label: "1 Kanal" },
  { value: "2 Kanal", label: "2 Kanal" },
] as const;
```

- Filter **UI** prefers these catalogs.
- `facets` may still return live `sizeLabel` / `developmentStage` values from PUBLISHED societies (union with catalog in the UI).
- V2 does **not** rewrite existing free-text `developmentStage` rows in a data migration; ops converge values over time.

### 3.3 `Society.startingPricePkr` (locked — H1)

```prisma
startingPricePkr Int?
@@index([publishStatus, startingPricePkr])
```

- Migration **backfills** `min(round(pricePerSqft * sizeSqft))` per society from `InventoryCategory`.
- Shared helper `recomputeSocietyStartingPrice(tx, societyId)` in `packages/api-client` (or a small lib next to the inventory router).
- Call it inside the same transaction on inventory category **create / update / delete** in [`inventory-category.router.ts`](../../../packages/api-client/src/routers/inventory-category.router.ts). If delete is absent today, add recompute on every write path that changes `pricePerSqft` or `sizeSqft`.
- `listSummaries` DTO may continue exposing `startingPrice` derived from the denormalized column (or keep computing from page categories for display consistency — prefer reading `startingPricePkr` once denormalized to avoid drift).

### 3.4 `listSummaries` query changes

Keep `publishStatus = PUBLISHED`. Apply:

```ts
// Conceptual
where: {
  publishStatus: PUBLISHED,
  // citySlug, authority, verificationTier, search as today
  // price:
  startingPricePkr: {
    ...(priceMinPkr != null ? { gte: priceMinPkr } : {}),
    ...(priceMaxPkr != null ? { lte: priceMaxPkr } : {}),
  },
  // plotType ∩ sizeLabel — single some(), AND inside:
  ...(plotType || sizeLabel
    ? {
        categories: {
          some: {
            ...(plotType ? { plotType } : {}),
            ...(sizeLabel ? { sizeLabel } : {}),
          },
        },
      }
    : {}),
  ...(developmentStage ? { developmentStage } : {}),
  ...(bookingStatus ? { bookingStatus } : {}),
}
```

**Sort (V2):**

- `name` — `orderBy: [{ name: "asc" }, { id: "asc" }]`
- `priceAsc` / `priceDesc` — `startingPricePkr` with nulls last, then `id`

Stay query-bounded — no per-society fan-out. Name search remains trigram-backed; city match remains `contains` (no city trigram in V2 — foundations §3.4).

### 3.5 `facets` enrichment

Extend `society.facets` (bounded groupBy/aggregates):

- cities: `{ slug, label, count }[]` — **counts required** (homepage chips + directory)
- authorities, tiers (existing)
- `plotTypes: { value, count }[]`
- `sizeLabels: { value, count }[]` (top N by count, cap 24)
- `developmentStages: { value, count }[]`
- `bookingStatuses: { value, count }[]`

**V2 facet counts = global PUBLISHED tallies** (not faceted-search scoped). Document that scoped counts are V2.1 if needed.

Update `apps/web/lib/queries.ts` `listCityFacets` to return `{ slug, label, count }` (stop stripping counts).

### 3.6 `society.suggest` (Session H4 — in-scope)

`publicProcedure` + `.use(rateLimit({ scope: "society:suggest", by: "ip" }))`.

Input: `{ q: string }` trim min 2 max 80.  
Output: `{ societies: { slug, name, citySlug, city, verificationTier }[], cities: { slug, label }[] }`.

- Societies: index-backed name search, limit 5, PUBLISHED only.
- Cities: match against facet cities / `PAKISTAN_CITIES`, limit 3.

---

## 4. UI components

| Component | Path | Notes |
|---|---|---|
| `SocietyDiscoveryBar` | `apps/web/components/marketplace/society-discovery-bar.tsx` | Client; props: facets, `mode: 'home' \| 'directory'`, `current` filters |
| `SocietyFilterSheet` | colocated or same file if small | Tier B filters |
| `SocietyFilters` | existing | **Replace usages** with DiscoveryBar — do not leave two diverging UIs |
| City chips | homepage section (H3) | Uses count-bearing facets |

Reuse `@sectoria/ui` `Input`, `Label`, `Select`, `Button` — `Input` already exists. Debounce via existing `useDebouncedValue` for directory search and typeahead.

### 4.1 URL helpers

`apps/web/lib/society-discovery-params.ts`:

- `parseSocietyDiscoveryParams(searchParams) → filters`
- `serializeSocietyDiscoveryParams(filters) → URLSearchParams`
- Shared by directory page / DiscoveryBar
- **Unit-tested** (Vitest): invalid tiers ignored; non-numeric prices ignored; `min > max` drops pair; round-trip serialize/parse

H0 ships parse/serialize for at least `search`, `citySlug`, `authority`, `verificationTier` (extend-friendly). H1/H2 extend for the full contract.

---

## 5. SEO

- Update `webSiteSchema()` `SearchAction` to target  
  `${SITE.url}/societies?search={search_term_string}`  
  with `query-input: required name=search_term_string` (Session H5).
- Directory `generateMetadata` already varies by city; extend description when `search` / `plotType` present (no keyword stuffing).

---

## 6. Tests

- Schema: rejects inverted price bounds on API; accepts optional fields; sort enum excludes `ratingDesc`.
- `listSummaries`: plotType / price / sizeLabel filters return only matching PUBLISHED societies; plotType+sizeLabel AND inside one category (integration).
- `startingPricePkr` backfill + recompute on category create/update (and delete if present).
- `suggest`: min length, PUBLISHED-only, limit caps, rate-limit middleware wired (`by: "ip"`).
- URL parse unit tests (see §4.1).
- Facets include city `count`; `listCityFacets` preserves counts.
- Component Storybook not required for marketplace-only comps unless extracted to `packages/ui`.

---

## 7. Acceptance

- [ ] Free-text search visible on directory (H0) and homepage (H3 via DiscoveryBar).
- [ ] `mode=home` shows Search + City inline only; budget/plot type behind Filters. `mode=directory` shows full Tier A inline.
- [ ] Tier B + home Filters sheet work via canonical URL params; public UI excludes `PENDING`.
- [ ] `startingPricePkr` denormalized, composite-indexed, backfilled; recompute on inventory writes; price sort/filter use it.
- [ ] Category filters use one `some()` with AND semantics; price uses society column.
- [ ] Facets feed filter options with counts; no full-table client scans.
- [ ] `society.suggest` shipped (H4), debounced, limited, `rateLimit` by IP.
- [ ] Params helpers unit-tested.
- [ ] No Book Now / dealer contact anywhere in the flow.

# Homepage & Discovery V2 — Build Playbook (Prompt File)

Companion to the split technical spec. The spec **index** is [`docs/architecture/homepage-v2-spec.md`](architecture/homepage-v2-spec.md); detailed parts live under [`docs/architecture/homepage-v2/`](architecture/homepage-v2/). Same format as [`docs/session-playbook.md`](session-playbook.md) and [`docs/society-profile-v2-playbook.md`](society-profile-v2-playbook.md): for **every** session you get the model tier, mode, files to attach, expected rules, a tightened prompt, and a test gate that must pass **before** the next session.

> Golden rule: **do not advance until every box in a session's Test Gate is ticked.**

> Attach discipline: each session attaches [`homepage-v2/foundations.md`](architecture/homepage-v2/foundations.md) **plus only the module file(s) for that session**. UI sessions also attach the design system.

> Product decision: [`ADR-010-search-first-homepage.md`](architecture/ADR-010-search-first-homepage.md). Concierge constraints: [ADR-007](architecture/ADR-007-concierge-pivot.md), `.cursor/rules/concierge-model.mdc`.

These sessions turn `/` into a **search-first discovery cockpit** for verified Pakistani housing societies (rich filters, shared directory pipeline, ranked featured) while keeping every CTA inside the concierge model.

**First visible ship:** H0→H3. **Hardening wave:** H4→H6.

---

## Model tiers (same map as `session-playbook.md`)

| Tier | Use for |
|---|---|
| **A — Strongest** | Schema + denormalized price, `listSummaries` filter/sort correctness, suggest rate limits |
| **B — Fast/Mid** | Discovery bar UI, homepage IA, SEO copy, E2E |
| **C — Either** | Mechanical wiring once patterns exist (default to B) |

**How to set it:** new chat → pick the tier's current top model **before** typing the prompt.

### Session → tier map

| Session | Topic | Tier | Mode |
|---|---|---|---|
| H0 | Params helper + directory free-text search (no homepage hero) | B | Agent |
| H1 | Types + `startingPricePkr` + rich `listSummaries` / `facets` | **A** | Agent |
| H1a | Seed `startingPricePkr` after category inserts (ship-review gap) | **A** | Agent |
| H1b | Seed `startingPricePkr` from persisted `pricePerSqft` (ship-review gap) | **A** | Agent |
| H2 | Shared `SocietyDiscoveryBar` on `/societies` (full Tier A) | B | Agent |
| H3 | Homepage IA + slim bar + `listFeatured` | B | Agent |
| H4 | Typeahead `society.suggest` + bar integration | **A** | Agent |
| H4a | DiscoveryBar typeahead + applied-chips UX (ship-review follow-up) | B | Agent |
| H5 | SEO SearchAction + city-chip a11y polish | B | Agent |
| H6 | E2E discovery path | B | Agent |

---

## Design documentation (attach in UI sessions)

**Attach** `@docs/design/Sectoria_Design_System.md` in **H0, H2, H3, H4a, H5**.  
**Do not attach it** in H1 (data/API) or H4 (API + listbox a11y from foundations/discovery-search is enough). **H6** attaches foundations + homepage-ia + existing e2e patterns.

Lean rules `ui-design-system-sectoria.mdc` and `ui-ux-excellence-sectoria.mdc` auto-load on `apps/web/app/**` and `packages/ui/**`.

---

## Pre-flight gate (GREEN before H0)

- [ ] On a clean branch off the latest `main`; working tree committed.
- [ ] `pnpm install` clean; `pnpm turbo run test lint typecheck` green at baseline.
- [ ] Read `@docs/architecture/homepage-v2-spec.md`, `@docs/architecture/homepage-v2/foundations.md`, and `@docs/architecture/ADR-010-search-first-homepage.md`.
- [ ] Confirm society directory scale work from M0 is present (`listSummaries`, `facets`, trigram on `name`).
- [ ] Confirm concierge rule loads: `.cursor/rules/concierge-model.mdc`.
- [ ] Postgres reachable for migrations (H1).

---

## Every session — same ritual

### A. Implement (one Cursor chat)

1. **New chat** in Cursor (Agent mode)
2. **Set model tier** listed for that session
3. **`@`-attach** exactly the files listed under **Attach**
4. **Paste** the session’s **Prompt** block
5. When the agent finishes, run the **Test Gate** — every box must pass
6. **Stop.** Report Test Gate results. Do **not** commit, push, open a PR, or merge unless the human explicitly asks (e.g. “ship it” / invokes `ship-pr`).

**Quality gate (after every session):**

```bash
pnpm turbo run test lint typecheck
```

### B. Review (human-triggered)

7. Human runs **`session-ship-review`** (`@.cursor/skills/session-ship-review/SKILL.md`) — expert panel vs this session’s prompt + test gate. Fix blockers or sub-sessions before shipping. Agents must **not** self-invoke review or treat the Test Gate as permission to ship.

### C. Ship (`ship-pr`, human-triggered)

8. Human invokes **`ship-pr`** (`@.cursor/skills/ship-pr/SKILL.md`) — branch → scoped commit → push → PR → wait for CI → merge → sync `main`
9. **Tick** the session in the Progress tracker below, then start the next session in a **new chat**

> **One session = one PR.** Do not batch H0 and H1 into a single PR.
> **Handoff:** Implement chat ends at a green Test Gate. Review and ship are separate, human-started steps.

---

# SESSIONS

---

## Session H0 — Params helper + directory search (no homepage hero)

- **Model:** Tier B
- **Mode:** Agent
- **Attach:** `@docs/architecture/homepage-v2/foundations.md` + `@docs/architecture/homepage-v2/discovery-search.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `routing-and-navigation`, `seo`, `concierge-model`.
- **Why first:** Backend already supports `search`; directory UI gap is the highest ROI fix. **Do not** add a throwaway homepage hero search — that lands in H3 with DiscoveryBar.

**Prompt:**
```
@docs/architecture/homepage-v2/foundations.md @docs/architecture/homepage-v2/discovery-search.md @docs/design/Sectoria_Design_System.md

Session H0 — wire directory search only. Do NOT change the homepage hero.
Do NOT add new DB columns or plot/price filters yet.

1. Add apps/web/lib/society-discovery-params.ts with parseSocietyDiscoveryParams
   and serializeSocietyDiscoveryParams for at least: search, citySlug, authority,
   verificationTier (extend-friendly for H1). Invalid verificationTier values
   are ignored. Add Vitest unit tests for parse/serialize round-trip and invalid
   ignore behavior.

2. Directory: update SocietyFilters to include a labelled free-text search input
   bound to the `search` URL param. Debounce router.replace ≥300ms via
   useDebouncedValue (locked — not submit-on-Enter for directory). Preserve city /
   verification / authority selects and Reset (Reset must clear search too).
   Public verification options: Any + VERIFIED + HSMS_LINKED only — remove
   PENDING from the public filter UI if present.

3. Wire societies/page.tsx through society-discovery-params (replace ad-hoc
   parseFilters where it overlaps). Pass current.search into SocietyFilters.

4. Five states: directory empty/error unchanged. Tokens only. No Book Now.
   No dealer links. No homepage edits.

Commit message:
feat(marketplace): directory search param helper and search input
```

**Test Gate:**
- [ ] `/societies?search=…` filters results via existing API.
- [ ] Directory shows a visible labelled search field; Reset clears `search`.
- [ ] Debounced replace (≥300ms) on search typing; no homepage hero changes.
- [ ] Public verification UI excludes `PENDING`.
- [ ] Vitest covers parse/serialize helpers.
- [ ] No new Prisma migration in this session.
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Ready for human review / ship (`session-ship-review` → `ship-pr`) — agent does not commit or open a PR unprompted.

---

## Session H1 — Rich filters API + `startingPricePkr`

- **Model:** Tier A
- **Mode:** Agent
- **Attach:** `@docs/architecture/homepage-v2/foundations.md` + `@docs/architecture/homepage-v2/discovery-search.md` + `@docs/architecture/ADR-010-search-first-homepage.md`
- **Rules expected to load:** `database`, `api-trpc`, `scalability-and-performance`, `oop-and-domain-modeling`, `concierge-model`.

**Prompt:**
```
@docs/architecture/homepage-v2/foundations.md @docs/architecture/homepage-v2/discovery-search.md @docs/architecture/ADR-010-search-first-homepage.md

Implement the discovery data layer (D1 / ADR-010). Locked decisions — do not
re-open forks:

1. Types: extend societyListSummariesInputSchema with plotType, sizeLabel,
   priceMinPkr, priceMaxPkr, developmentStage, bookingStatus, sort
   (name | priceAsc | priceDesc ONLY — no ratingDesc). Keep search/city/
   authority/tier. API BAD_REQUEST when both price bounds set and min > max.
   Add DEVELOPMENT_STAGES and COMMON_PLOT_SIZE_LABELS catalogs in packages/types
   (same pattern as PAKISTAN_CITIES).

2. Schema: Society.startingPricePkr Int? + @@index([publishStatus, startingPricePkr]).
   Migration BACKFILLs min(round(pricePerSqft * sizeSqft)) per society.
   Add recomputeSocietyStartingPrice(tx, societyId) and call it in the same
   transaction from inventory-category.router create/update (and delete if that
   path exists).

3. listSummaries: PUBLISHED only; price filters use startingPricePkr; plotType
   and sizeLabel AND inside a single categories.some; developmentStage /
   bookingStatus on Society; sort name or startingPricePkr nulls last.
   Search: name trigram / contains + city contains — do NOT add a city trigram.
   Stay query-bounded. Extend tests.

4. facets: enrich with plotTypes, sizeLabels (cap 24), developmentStages,
   bookingStatuses; cities MUST include count. V2 = global PUBLISHED counts.
   Update apps/web/lib/queries.ts listCityFacets to return { slug, label, count }
   and SocietyFilters / listSocietySummaries to pass new filter fields.
   Extend society-discovery-params for the new URL keys (drop price pair when
   min > max; ignore invalid enums).

5. Do not build SocietyDiscoveryBar (H2). Do not change homepage IA (H3).

Commit message:
feat(discovery): rich society filters, startingPricePkr, enriched facets
```

**Test Gate:**
- [ ] Migration backfills `startingPricePkr`; composite index present (SQL reviewed).
- [ ] Category price changes recompute society `startingPricePkr` (test).
- [ ] `listSummaries` filters by plotType / price / sizeLabel with AND-in-some semantics (test).
- [ ] Sort `priceAsc` / `priceDesc` stable with nulls last (test).
- [ ] Facets return new dimensions + city counts without N+1.
- [ ] Public reads still exclude non-PUBLISHED; no `ratingDesc` in schema.
- [ ] Params helper extended + unit tests for price pair drop.
- [ ] `pnpm turbo run test lint typecheck` clean.
- [x] H1a complete (ship-review gap — seed must set `startingPricePkr`).
- [x] H1b complete (ship-review gap — seed must use persisted `pricePerSqft`).
- [x] Ready for human review / ship (`session-ship-review` → `ship-pr`) — agent does not commit or open a PR unprompted.

---

## Session H1a — Seed `startingPricePkr` (ship-review gap)

- **Model:** Tier A
- **Mode:** Agent
- **Parent:** H1 — run after H1 Test Gate (implementation) passes; complete before H2 / before shipping H1
- **Attach:** `@docs/architecture/homepage-v2/foundations.md` + `@docs/architecture/homepage-v2/discovery-search.md` + `@docs/architecture/ADR-010-search-first-homepage.md`
- **Rules expected to load:** `database`, `scalability-and-performance`, `oop-and-domain-modeling`.

**Prompt:**
```
@docs/architecture/homepage-v2/foundations.md @docs/architecture/homepage-v2/discovery-search.md @docs/architecture/ADR-010-search-first-homepage.md

H1a — close the seed gap for denormalized Society.startingPricePkr.

Seeds create InventoryCategory rows via Prisma directly (not inventoryCategory
router), so recomputeSocietyStartingPrice never runs on seed. After migrate +
seed, startingPricePkr stays null and price filter/sort / H3 listFeatured /
H6 budget E2E break on fresh DBs.

1. packages/database/prisma/seed.ts: after each society's categories are
   created, set Society.startingPricePkr = min(round(pricePerSqft * sizeSqft))
   for that society (same formula as recomputeSocietyStartingPrice / migration
   backfill). Prefer a small shared helper in packages/database (or inline the
   min formula once per society) — do not import @sectoria/api-client into seed.

2. packages/database/prisma/seed-urban-city-lahore.ts: same update after its
   inventory categories are created.

3. Societies with zero categories remain null (correct).

Do not build SocietyDiscoveryBar (H2). Do not change homepage IA (H3).
Do not add city trigram or ratingDesc.

Commit message:
fix(database): seed Society.startingPricePkr from category totals
```

**Test Gate:**
- [x] Fresh seed leaves non-null `startingPricePkr` on societies that have categories (manual SQL or seed assertion).
- [ ] Formula matches migration / `recomputeSocietyStartingPrice` (`round(pricePerSqft * sizeSqft)` min). → **H1b** (seed must use persisted `pricePerSqft`, not raw float).
- [x] Urban City Lahore seed also sets `startingPricePkr`.
- [x] `pnpm turbo run test lint typecheck` clean.
- [x] H1b complete (ship-review gap — persisted Decimal input).
- [x] Ready for human review / ship with H1 (`session-ship-review` → `ship-pr`) — agent does not commit or open a PR unprompted.

---

## Session H1b — Seed `startingPricePkr` from persisted `pricePerSqft` (ship-review gap)

- **Model:** Tier A
- **Mode:** Agent
- **Parent:** H1a — run after H1a implementation; complete before shipping H1 / before H2
- **Attach:** `@docs/architecture/homepage-v2/foundations.md` + `@docs/architecture/homepage-v2/discovery-search.md` + `@docs/architecture/ADR-010-search-first-homepage.md`
- **Rules expected to load:** `database`, `scalability-and-performance`, `oop-and-domain-modeling`.

**Prompt:**
```
@docs/architecture/homepage-v2/foundations.md @docs/architecture/homepage-v2/discovery-search.md @docs/architecture/ADR-010-search-first-homepage.md

H1b — close the seed formula-drift gap for Society.startingPricePkr.

H1a sets startingPricePkr via computeSocietyStartingPricePkr, but seeds pass the
raw in-memory pricePerSqftRupees float while InventoryCategory rows are stored
as Decimal(pricePerSqftRupees.toFixed(2)). Migration backfill and
recomputeSocietyStartingPrice read the persisted Decimal. On Urban City Lahore
inventory this drifts by 1–23 PKR per category (e.g. 1-kanal: seed 6500000 vs
recompute 6500023), so seed values do not match the H1a/H1 formula gate.

1. packages/database/prisma/seed.ts and seed-urban-city-lahore.ts: when calling
   computeSocietyStartingPricePkr, pass pricePerSqft from the value actually
   persisted (Number(pricePerSqftRupees.toFixed(2)) or Number(created
   category.pricePerSqft)) — not the raw division/float before toFixed(2).

2. packages/database/src/__tests__/society-starting-price.test.ts (or a small
   colocated seed-helper test): assert at least one Urban City fixture case
   where raw float ≠ toFixed(2) input produces different totals, and that the
   seed path uses the persisted-rounded input (same as recompute).

3. Do not change the migration SQL or recomputeSocietyStartingPrice formula.
   Do not build SocietyDiscoveryBar (H2) or homepage IA (H3).

Commit message:
fix(database): seed startingPricePkr from persisted category pricePerSqft
```

**Test Gate:**
- [x] Seed compute input uses persisted/rounded `pricePerSqft` (code review + test).
- [x] Urban City fixture case that previously drifted now matches
      `Math.round(Number(raw.toFixed(2)) * sizeSqft)` (test).
- [x] `pnpm turbo run test lint typecheck` clean.
- [x] Ready for human review / re-run `session-ship-review` on H1a+H1b before `ship-pr`.

---

## Session H2 — Shared `SocietyDiscoveryBar` on directory

- **Model:** Tier B
- **Mode:** Agent
- **Attach:** `@docs/architecture/homepage-v2/foundations.md` + `@docs/architecture/homepage-v2/discovery-search.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `routing-and-navigation`, `nextjs-app-router`, `concierge-model`.

**Prompt:**
```
@docs/architecture/homepage-v2/foundations.md @docs/architecture/homepage-v2/discovery-search.md @docs/design/Sectoria_Design_System.md

Build SocietyDiscoveryBar and wire it on /societies (directory mode). Support
mode 'home' | 'directory' in props, but do NOT rebuild homepage IA in this
session (H3 owns home). First-look lock: mode=home inline = Search + City
only; mode=directory = full Tier A.

1. Component at apps/web/components/marketplace/society-discovery-bar.tsx
   (client leaf). Props: facets payload, mode 'home' | 'directory', current
   filters from society-discovery-params.

2. mode=directory Tier A inline: search, city, budget presets (priceMin/Max
   per discovery-search.md), plot type. Tier B in "Filters" sheet/popover:
   verification (VERIFIED + HSMS_LINKED only), authority, sizeLabel,
   developmentStage, bookingStatus, sort (name | priceAsc | priceDesc).

3. mode=home (implement now, wire in H3): inline Search + City + Search CTA
   only; Budget, plot type, and Tier B all behind Filters. Elevated card
   shadow-sm / focus shadow-md; search field min height 44–48px; Search
   button size lg.

4. mode=directory: search debounced ≥300ms replace; Tier A auto-applies via
   router.replace; Filters sheet has Apply; Reset clears all params. Native
   <select> below md like the old SocietyFilters.

5. Replace SocietyFilters usage on /societies with SocietyDiscoveryBar.
   Remove or thin-wrap the old component — one source of truth.

6. Wire enriched society.facets (including city counts). Partial state if facets
   fail (filters usable with empty option lists + error note).

Tokens only; labelled fields; 44px targets; no Book Now. No analytics stub.

Commit message:
feat(marketplace): shared SocietyDiscoveryBar with rich filters
```

**Test Gate:**
- [x] `/societies` uses DiscoveryBar with full Tier A inline; old UI gone or wrapped.
- [x] `mode=home` prop path shows Search + City only (budget/type behind Filters) — unit/story or manual prop check.
- [x] Budget preset writes correct `priceMinPkr` / `priceMaxPkr` URL params on directory.
- [x] Public verification options exclude `PENDING`.
- [x] Mobile layout usable at ~390px width (manual check).
- [x] `pnpm turbo run test lint typecheck` clean.
- [x] Ready for human review / ship (`session-ship-review` → `ship-pr`) — agent does not commit or open a PR unprompted.

---

## Session H3 — Homepage IA + slim bar + `listFeatured`

- **Model:** Tier B
- **Mode:** Agent
- **Attach:** `@docs/architecture/homepage-v2/foundations.md` + `@docs/architecture/homepage-v2/homepage-ia.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `seo`, `concierge-model`, `code-modularity-and-structure`, `api-trpc`.

**Prompt:**
```
@docs/architecture/homepage-v2/foundations.md @docs/architecture/homepage-v2/homepage-ia.md @docs/design/Sectoria_Design_System.md

Rebuild apps/web/app/(marketplace)/page.tsx per homepage-ia.md (D2) — first-look
locks are mandatory.

1. First viewport ONLY: one compact trust line ("Verified before it's listed")
   + H1 + one supporting sentence + SocietyDiscoveryBar (mode=home: Search +
   City + Search CTA only) + city chips (count > 0, max 6, order by count desc,
   muted counts, mobile horizontal scroll). Chips link to
   /societies?citySlug=…. Do NOT put Why-bento, budget/type inline, or
   Explore societies primary in the first viewport. mode=home: compose
   locally; Search/Enter pushes /societies?…. Sole filled primary = Search
   (size lg). Get best price stays in next-step band (omit from hero or one
   ghost/text link max).

2. Extract HomeHero / HomeTrustStrip / HomeFeaturedSocieties / HomeWhyBento /
   HomeNextStepBand so the page is a thin composition root.

3. Compact trust strip below the hero; Why-bento below featured; next-step
   band: Compare + Get best price.

4. Featured (locked — NOT priceAsc interim): implement society.listFeatured({
   limit: 6 }) with homepage-ia.md §2.2 ranking (HSMS_LINKED → VERIFIED →
   startingPricePkr asc nulls last → name). Wire HomeFeaturedSocieties to it.
   Add unit/integration test for order. Copy must NOT say "ordered
   alphabetically" or imply cheapest-first.

5. Keep JsonLd (Organization, WebSite, Breadcrumb). Keep revalidate=3600.
   Concierge CTAs only. Design tokens only. No analytics stub. No sticky search.

Commit message:
feat(marketplace): search-first homepage with listFeatured ranking
```

**Test Gate:**
- [x] First viewport: trust line + H1 + sentence + Search/City bar + ≤6 chips; no budget/type inline; no Explore primary; Why-bento not above search.
- [x] Page decomposed into section components.
- [x] `listFeatured` ranking matches HSMS → VERIFIED → price → name (test).
- [x] Empty/error for featured still handled.
- [x] `pnpm turbo run test lint typecheck` clean.
- [x] Ready for human review / ship (`session-ship-review` → `ship-pr`) — agent does not commit or open a PR unprompted.

---

## Session H4 — Typeahead `society.suggest`

- **Model:** Tier A
- **Mode:** Agent
- **Attach:** `@docs/architecture/homepage-v2/foundations.md` + `@docs/architecture/homepage-v2/discovery-search.md`
- **Rules expected to load:** `api-trpc`, `security`, `scalability-and-performance`, `ui-ux-excellence-sectoria` (listbox a11y).

**Prompt:**
```
@docs/architecture/homepage-v2/foundations.md @docs/architecture/homepage-v2/discovery-search.md

Add society.suggest (in-scope — not optional):

1. publicProcedure + .use(rateLimit({ scope: "society:suggest", by: "ip" }))
   using packages/api-client/src/middleware/rate-limit.ts. Zod input q trim
   min 2 max 80. Output societies (≤5: slug, name, citySlug, city,
   verificationTier) + cities (≤3: slug, label). PUBLISHED only. Index-backed
   name search; cities from facets/PAKISTAN_CITIES match.

2. Integrate into SocietyDiscoveryBar: debounced ≥200ms, keyboard listbox
   pattern, Esc closes. Society → profile URL; city → set citySlug + navigate
   to directory. Do not fire suggest under 2 chars or without debounce.

Tests for PUBLISHED-only, limits, short-q rejection, and middleware wiring
(follow existing lead.create rate-limit test patterns).

Commit message:
feat(discovery): society suggest typeahead for discovery bar
```

**Test Gate:**
- [x] `suggest` tests cover limits + PUBLISHED-only + min length.
- [x] `rateLimit({ scope: "society:suggest", by: "ip" })` is applied (not deferred).
- [x] Bar typeahead keyboard-accessible; reduced-motion safe.
- [x] `pnpm turbo run test lint typecheck` clean.
- [x] Ready for human review / ship (`session-ship-review` → `ship-pr`) — agent does not commit or open a PR unprompted.

---

## Session H4a — DiscoveryBar typeahead + applied-chips UX (ship-review follow-up)

- **Model:** Tier B
- **Mode:** Agent
- **Parent:** H4 — run after H4 Test Gate passes; complete before H5
- **Attach:** `@docs/architecture/homepage-v2/foundations.md` + `@docs/architecture/homepage-v2/discovery-search.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-ux-excellence-sectoria`, `ui-design-system-sectoria`, `concierge-model`.

**Prompt:**
```
@docs/architecture/homepage-v2/foundations.md @docs/architecture/homepage-v2/discovery-search.md @docs/design/Sectoria_Design_System.md

H4a closes post-H4 DiscoveryBar UX gaps (typeahead + applied-state). Do NOT
start H5 SEO / city-chip work or H6 E2E.

1. Typeahead: ensure the suggest listbox is not clipped by hero
   `overflow-hidden`; keep listbox z-index above following homepage sections.
   Do not let a late-mounting Reset control steal width from the search
   column while typing.

2. Applied filters: add a compact chip row under the toolbar with a
   "Filters" label and "Clear all". Chip every active dimension (search,
   city, budget, plot type, sheet filters). Category · value + dismiss.
   Pure helper + Vitest in apps/web/lib/society-discovery-ui.ts.

3. Density: keep the bar slim (tight padding/gap); directory search column
   takes leftover width; city/budget/plot type stay content-capped. Tokens
   only; no Book Now; preserve 44px primary control heights.

Commit message:
fix(discovery): polish discovery bar typeahead and applied filter chips
```

**Test Gate:**
- [x] Typeahead listbox paints over the trust strip (no hero overflow clip).
- [x] Search column does not shrink when applied state appears.
- [x] `buildAppliedDiscoveryChips` covers toolbar + sheet dimensions; Vitest green.
- [x] Chip row shows Filters label + Clear all; dismiss patches URL / home draft.
- [x] `pnpm turbo run test lint typecheck` clean.
- [x] Ready for human review / ship (`session-ship-review` → `ship-pr`) — agent does not commit or open a PR unprompted.

---

## Session H5 — SEO SearchAction + chip a11y polish

- **Model:** Tier B
- **Mode:** Agent
- **Attach:** `@docs/architecture/homepage-v2/foundations.md` + `@docs/architecture/homepage-v2/homepage-ia.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `seo`, `ui-design-system-sectoria`, `concierge-model`.

**Prompt:**
```
@docs/architecture/homepage-v2/foundations.md @docs/architecture/homepage-v2/homepage-ia.md @docs/design/Sectoria_Design_System.md

H5 is polish only — listFeatured already shipped in H3. Do NOT rework ranking.

1. SEO: update webSiteSchema SearchAction to
   societies?search={search_term_string} (discovery-search.md §5). Ensure
   homepage generateMetadata remains sensible.

2. City chips: confirm aria-labels (`Societies in {city}`); horizontal scroll
   on mobile; max 6; muted counts — fix any gaps left from H3.

3. Spot-check first viewport still matches homepage-ia.md §2 (no dual primary
   CTAs, no budget/type inline on home).

4. Do NOT add analytics stubs. Do NOT add featuredRank column (V2.1).

Commit message:
feat(marketplace): discovery SearchAction SEO and city chip a11y
```

**Test Gate:**
- [ ] SearchAction JSON-LD matches real search UX.
- [ ] City chips accessible and capped at 6 with muted counts.
- [ ] No ranking / analytics stub / featuredRank in the diff.
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Ready for human review / ship (`session-ship-review` → `ship-pr`) — agent does not commit or open a PR unprompted.
---

## Session H6 — E2E discovery path

- **Model:** Tier B
- **Mode:** Agent
- **Attach:** `@docs/architecture/homepage-v2/foundations.md` + `@docs/architecture/homepage-v2/homepage-ia.md`
- **Rules expected to load:** Playwright/E2E conventions; `concierge-model`, `testing.mdc`.

**Prompt:**
```
@docs/architecture/homepage-v2/foundations.md @docs/architecture/homepage-v2/homepage-ia.md

Add Playwright coverage for the discovery happy path. Follow patterns and
seeded fixtures from e2e/society-profile-v2.spec.ts (e.g. urban-city-lahore /
lahore). Prefer a new e2e/homepage-discovery.spec.ts.

1. Home → use DiscoveryBar (search and/or city) → land on /societies with
   params → see result count or cards → open a society profile
   (urban-city-lahore when searching that name).
2. Directory: apply budget or plotType filter → URL updates → results update.
3. Assert no "Book Now" on home or directory.
4. Assert Get best price / support path reachable from next-step band or footer.

Keep the suite deterministic; use seeded PUBLISHED societies only.

Commit message:
test(marketplace): e2e coverage for homepage discovery funnel
```

**Test Gate:**
- [ ] New E2E spec passes locally against seeded DB.
- [ ] Concierge assertion: no Book Now on discovery surfaces.
- [ ] `pnpm turbo run test lint typecheck` clean (and e2e job if separate).
- [ ] Ready for human review / ship (`session-ship-review` → `ship-pr`) — agent does not commit or open a PR unprompted.

---

## Progress tracker

| Session | Title | Wave | Status |
|---|---|---|---|
| H0 | Params helper + directory search | First ship | ✅ |
| H1 | Rich filters API + `startingPricePkr` | First ship | ✅ |
| H1a | Seed `startingPricePkr` (ship-review gap) | First ship | ✅ |
| H1b | Seed from persisted `pricePerSqft` (ship-review gap) | First ship | ✅ |
| H2 | `SocietyDiscoveryBar` on `/societies` (full Tier A) | First ship | ✅ |
| H3 | Homepage IA + slim bar + `listFeatured` | First ship | ✅ |
| H4 | Typeahead `society.suggest` | Hardening | ✅ |
| H4a | DiscoveryBar typeahead + applied-chips UX | Hardening | ✅ |
| H5 | SEO SearchAction + chip a11y polish | Hardening | ⬜ |
| H6 | E2E discovery path | Hardening | ⬜ |

---

## Expert panel summary (why this order)

| Lens | Recommendation encoded above |
|---|---|
| Marketplace UX | Search-first hero; home = Search+City only; directory keeps rich Tier A |
| First look | One trust line; one primary (Search); ≤6 city chips; trust-first featured in H3 |
| Pakistan RE market | City + budget (lakh/crore) + marla/kanal size; verification as trust facet (no PENDING in public UI) |
| Concierge / trust | Discovery → profile/compare/quote; demote brochure bento; no dealer spam |
| Engineering | Reuse M0 `listSummaries`; denormalize price once; one shared bar; no throwaway H0 home UI |
| SEO / growth | SearchAction in H5; filtered directory remains crawlable |
| Efficiency | H0→H3 first ship (featured ranking included); H4–H6 harden |

**V2.1 (explicitly out of these sessions):** directory Load-more UI, sticky search, `ratingDesc`, `featuredRank`, scoped facet counts, city trigram, analytics vendor.

# Homepage & Discovery V2 — Technical Specification (Index)

**Status:** Accepted
**Date:** 2026-07-11
**Owner:** Marketplace / Discovery experience
**Related:** [ADR-007 (concierge pivot)](ADR-007-concierge-pivot.md), [ADR-010 (search-first homepage)](ADR-010-search-first-homepage.md), [Society Profile V2](society-profile-v2-spec.md)
**Build prompts:** [`docs/homepage-v2-playbook.md`](../homepage-v2-playbook.md)

> This spec is **split into focused files** under [`homepage-v2/`](homepage-v2/) so each build session attaches only the slice it needs. Start with [`foundations.md`](homepage-v2/foundations.md), then the relevant module. The playbook's per-session **Attach** lines tell you exactly which files to load.

---

## 1. Context

Sectoria's public homepage (`apps/web/app/(marketplace)/page.tsx`) is a **trust brochure**, not a **discovery cockpit**. The society directory (`/societies`) already has city / authority / verification filters and an index-backed `search` param in the API — but the homepage never surfaces search, and the directory UI **does not even render a search input** despite the backend supporting it.

World-class marketplaces (Airbnb, Booking.com, Zillow, Property Finder, Bayut, Zameen) treat the first viewport as: **brand + one job = find the right inventory**. Sectoria should do the same for *verified housing societies*, while staying inside the concierge model (compare → request quote → advisor; no self-serve booking; no dealer contact).

### 1.1 Expert panel — current vs world-class

| Dimension | World-class pattern | Sectoria today | Gap severity |
|---|---|---|---|
| Primary job of `/` | Search / filter to inventory | Two CTAs ("Explore societies", "Get best price") | **Critical** |
| Hero composition | Search bar as the product | Headline + trust pill + buttons | **Critical** |
| Free-text search | Typeahead + submit to results | API supports `search`; **no UI on home or directory** | **Critical** |
| Rich filters | City, budget, type, size, trust tier | City, authority, verification only | High |
| Progressive disclosure | 2–3 primary facets + "More filters" | Three equal selects in a card | Medium |
| Shareable state | All filters in URL | Directory yes; homepage none | Medium |
| Featured / ranking | Curated, trending, or recency | Alphabetical slice of 6 | High |
| City shortcuts | Chips / destination hubs | Only via filter dropdown | Medium |
| Trust near search | Compact trust line under search | Large "Why Sectoria" bento *before* inventory | Medium |
| SEO SearchAction | Matches real search URL | `?city={city}` only — not free-text | Low |
| Concierge funnel | Search → profile/compare → quote | Intact on profile; weak from home | Medium |

### 1.2 Goals

1. Make **finding a targeted society** the primary homepage interaction (search + rich filters).
2. Reuse and extend the existing directory pipeline (`listSummaries` / `facets` / URL params) — home submits into `/societies?...`, it does not invent a parallel results system.
3. Deliver **best-in-class UI/UX** consistent with the Sectoria design system (tokens, five-states, trust patterns, mobile-first).
4. Keep every change **additive** at the data layer where possible; new filter dimensions must stay **index-backed** and query-bounded (M0.7 scale rules). Denormalize `startingPricePkr` for price filter/sort.
5. Preserve **concierge**: no Book Now, no dealer exposure, quote remains the conversion path.

### 1.3 Non-goals (hard constraints)

- **No self-serve booking from search.** Results lead to society profiles / compare / "Get best price" — never a book CTA (`.cursor/rules/concierge-model.mdc`).
- **No map-first homepage** in V2 (map stays on society profile per ADR-008). Map results are V2.1+.
- **No personalization / ML ranking** in V2 — deterministic featured ranking only.
- **No `ratingDesc` sort, sticky search, directory Load-more UI, or analytics stub** in V2 (see foundations Tier C / ADR-010 follow-ups).
- **No new plaintext PII** anywhere.
- **No fear-based urgency copy** ("Only 2 left!") — trust tone only.

---

## 2. Document map

**Always read first:** [`foundations.md`](homepage-v2/foundations.md) — expert thesis, IA principles, architecture/layering, locked filter semantics, rollout, acceptance.

### Modules

| Module | File | Build sessions |
|---|---|---|
| D1 — Discovery search & rich filters (API + shared UI) | [discovery-search.md](homepage-v2/discovery-search.md) | H0, H1, H2, H4 |
| D2 — Homepage information architecture | [homepage-ia.md](homepage-v2/homepage-ia.md) | H3, H5, H6 |

### Cross-cutting

| Concern | Where |
|---|---|
| Product decision (search-first) | [ADR-010](ADR-010-search-first-homepage.md) |
| Concierge constraints | `.cursor/rules/concierge-model.mdc`, foundations §2 |
| Design tokens / components | `@docs/design/Sectoria_Design_System.md` |
| Directory scale / search indexes | [society-profile-v2/m0-onboarding-and-scale.md](society-profile-v2/m0-onboarding-and-scale.md) |

### Session map (see playbook)

| Session | Topic | First-ship? |
|---|---|---|
| H0 | Params helper + directory search | Yes |
| H1 | `startingPricePkr` + rich filters/facets | Yes |
| H2 | `SocietyDiscoveryBar` on `/societies` (full Tier A) | Yes |
| H3 | Homepage IA + slim bar + `listFeatured` | Yes |
| H4 | `society.suggest` typeahead | Hardening |
| H5 | SEO SearchAction + chip a11y polish | Hardening |
| H6 | Playwright discovery path | Hardening |

---

## 3. Product thesis (one sentence)

**Home is the discovery cockpit for verified Pakistani housing societies: search and filter first, trust second, featured proof third — every path ends at compare or a concierge quote.**

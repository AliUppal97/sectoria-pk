# ADR-010: Search-First Homepage & Shared Society Discovery

**Status:** Accepted  
**Date:** 2026-07-11  
**Related:** [ADR-007 Concierge pivot](ADR-007-concierge-pivot.md), [Homepage V2 spec](homepage-v2-spec.md)

---

## Context

The public homepage is trust-marketing with CTAs into the directory. World-class marketplaces make **search/filter the primary first-viewport action**. Sectoria already has index-backed `society.listSummaries({ search, citySlug, … })` and URL-driven directory filters, but:

- `/` has no search UI
- `/societies` omits the `search` input despite API support
- Filters omit high-intent dimensions (budget, plot type, size)

We need a durable product/architecture decision before UI sessions diverge.

## Decision

1. **Homepage is search-first.** The primary hero action is a shared `SocietyDiscoveryBar` that composes filters and navigates to `/societies` with canonical query params — not a second results engine on `/`.
2. **One discovery system.** Home and directory share the same component, param contract, and `listSummaries` / `facets` API surface.
3. **Rich filters are additive and index-backed.** Extend the existing Zod input. **Denormalize `Society.startingPricePkr`** in the first data session for correct price filter/sort at directory scale (composite index `[publishStatus, startingPricePkr]`; maintain via `recomputeSocietyStartingPrice` on inventory writes). Do not filter price by loading all categories into memory.
4. **Homepage progressive disclosure.** On `/`, DiscoveryBar shows **Search + City** inline only; budget, plot type, and Tier B live behind Filters. On `/societies`, full Tier A stays inline (results-page density).
5. **Category filters AND inside one `categories.some`.** Plot type and sizeLabel must match the same category row; price uses the society column.
6. **Public verification UI** offers `VERIFIED` and `HSMS_LINKED` only (`PENDING` stays off the marketplace filter).
7. **V2 sorts** are `name | priceAsc | priceDesc` only — no `ratingDesc` until a maintained aggregate exists.
8. **Concierge unchanged.** Discovery ends at profile / compare / quote — never self-serve booking or dealer contact (ADR-007).
9. **Trust content is demoted, not deleted.** One compact trust line stays in the hero; "Why Sectoria" bento remains below discovery + featured proof.
10. **`society.suggest` is in-scope** for V2 and uses existing `rateLimit({ scope: "society:suggest", by: "ip" })`.
11. **No analytics stub in V2.**
12. **Featured ranking** (`listFeatured`, HSMS → VERIFIED → price → name) ships with the homepage IA session — not cheapest-first interim.

## Consequences

### Positive

- Matches buyer mental models from Bayut / Property Finder / Zillow without copying listing-spam patterns.
- Reuses M0.7 directory scale work instead of duplicating query paths.
- Shareable, bookmarkable, SEO-aligned filtered views stay on `/societies`.
- Agents implementing the playbook have no "pick one" forks on price strategy or H0 homepage scope.

### Negative / costs

- Requires a denormalized price field + backfill and inventory write-path maintenance.
- Homepage hero becomes more interactive (client island) — must preserve CWV via server-rendered shell + light client bar.
- Facet counts are global PUBLISHED tallies in V2 (not scoped faceted-search counts).
- Name trigram only; city search remains `contains` without a city trigram (smallest diff).

### Follow-ups (V2.1)

- Directory "Load more" / cursor pagination UI (API already supports cursor; page shows first 48).
- Sticky compact search on scroll.
- `ratingDesc` sort / maintained `avgRating`.
- Ops `featuredRank` curation column.
- Scoped facet counts; city trigram if search quality demands it.
- Map-based discovery (ADR-008 profile maps remain the map surface).
- Real analytics vendor wiring (no no-op stub beforehand).

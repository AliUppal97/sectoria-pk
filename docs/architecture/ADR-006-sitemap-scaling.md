# ADR-006: Sitemap scaling — single file now, sharded index past ~50k URLs

- **Status:** Accepted (backfilled 2026-06-30)
- **Date:** 2026-06-28
- **Related:** `apps/web/app/(marketplace)/sitemap.ts`, `seo.mdc`

> **Note:** This ADR documents a decision made during the initial build. It is
> backfilled here per `documentation.mdc` — the codebase already reflects it.

## Context

Public SEO depends on a complete, fresh sitemap covering every crawlable
society, inventory category, and dealer profile. Next.js App Router supports:

- A single `sitemap.ts` returning all URLs (simple, works at small scale).
- **`generateSitemaps` + sitemap index** — multiple shard files when URL count
  grows (Google’s practical limit is ~50,000 URLs per sitemap file).

At launch, seeded data is orders of magnitude below that limit. Building shard
infrastructure upfront adds complexity without current benefit, but the product
plan explicitly targets nationwide society coverage — the scaling step must not
be an surprise.

## Decision

1. **Launch implementation:** One dynamic `sitemap.ts` that queries all
   `Society`, `InventoryCategory`, and `DealerProfile` rows and emits a single
   sitemap with `lastModified` from `updatedAt`. Static marketplace routes
   (home, directories, compare) are included inline.
2. **Resilience:** If the database is unreachable at build time, fall back to
   static entries only so production builds still succeed.
3. **Scale trigger:** When URL count approaches **50,000**, migrate to Next.js
   sitemap index conventions:
   - `generateSitemaps()` returning shard ids (e.g. by city prefix or society id range).
   - Per-shard `sitemap.ts` handlers emitting `sitemap-societies-[n].xml` style paths.
   - Document the shard key strategy in `docs/runbooks/scaling-sitemap-beyond-50k-urls.md`.

## Consequences

- **Positive:** Simple, correct sitemap for day one; ISR/SSR pages get indexed
  without operational overhead.
- **Positive:** Scale path is named before it is needed — no ad-hoc fire drill.
- **Negative / trade-off:** A monolithic sitemap generation query will eventually
  become slow; monitor build time and DB load as directory size grows.
- **Operational note:** Adding a new publicly crawlable entity type requires a
  sitemap entry in the same PR (`seo.mdc`).

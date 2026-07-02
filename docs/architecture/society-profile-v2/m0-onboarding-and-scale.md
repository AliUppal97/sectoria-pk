# M0 — Society lifecycle, onboarding & directory scale (foundational)

> Read with [`foundations.md`](foundations.md). **M0 ships first** — it makes society data a governed, scalable dataset so every society in Pakistan can be added one-by-one. M1–M8 enrich the profile on top of it. Build session: **S0**.

**Problem:** Today societies exist **only via `packages/database/prisma/seed.ts`**. `society.router.ts` has `list`, `getBySlug`, `update` (society-admin), `getPortalOverview`, `updateCompliance` — **no `create` mutation at all**. Every row is implicitly public (no draft state), and the directory loads the full table with an **N+1 fan-out** (`listSocietySummaries` queries categories + reviews per society) plus **three full-table facet scans** (`listCityFacets`/`listAuthorityFacets`/`listSocietyOptions` each call `society.list()` and reduce in memory — see `apps/web/lib/queries.ts`). None of that survives onboarding every society in Pakistan one-by-one (hundreds–thousands of rows, many incomplete or in-progress). This module makes society data first-class, governed, and scalable.

## M0.1 Lifecycle & visibility

Add to `Society`:

```prisma
enum SocietyPublishStatus {
  DRAFT      // being entered; not publicly visible
  PUBLISHED  // live on the marketplace
  ARCHIVED   // delisted; retained for history/audit
}

// new Society fields:
publishStatus SocietyPublishStatus @default(DRAFT)
publishedAt   DateTime?
createdById   String?  // ops/admin user who created the record (audit/ownership)
```

**Every public read filters `publishStatus = PUBLISHED`**: `society.list`, `society.getBySlug`, the summary/facet procedures, `sitemap.ts`, and `generateStaticParams`. Drafts/archived are visible only to platform staff and the owning society admin. This is precisely what lets you add societies incrementally without exposing half-entered profiles. Add `@@index([publishStatus, citySlug])`.

## M0.2 Creation & ownership

- `society.create` — **`opsProcedure`** (SALES_ADVISOR, SUPER_ADMIN). Society onboarding is platform/ops work, not self-service. Input is the minimal identity set (name, city, citySlug, authority, slug); everything else is filled in later. Slug uniqueness enforced; on conflict throw `TRPCError` `CONFLICT`. Created as `DRAFT`.
- `society.setPublishStatus` — `opsProcedure`; publishing is gated on the completeness check (M0.4).
- `society.assignAdmin` — **`superAdminProcedure`**; links/unlinks a `User(role=SOCIETY_ADMIN)` to a society. A society may be **platform-managed** (no linked admin, ops maintain it) or **society-managed** (admin assigned). Existing `assertSocietyOwnership` / `resolveOwnedSocietyId` continue to gate society-portal writes once an admin exists.
- **Audit:** create/publish/archive emit a `LedgerEvent` (`SOCIETY_CREATED`, `SOCIETY_PUBLISHED`, `SOCIETY_ARCHIVED`; `entityId = societyId`) **through the standard ledger builder** — never an ad-hoc audit row (`.cursor/rules/database.mdc`).

## M0.3 Admin onboarding console

New admin surface `apps/web/app/(admin)/admin/societies/`:

- Paginated, searchable, filterable list (city, authority, tier, `publishStatus`) with a **completeness %** column and quick publish/unpublish/archive actions (confirm dialogs).
- "Create society" wizard (identity -> location -> compliance -> content), saving as `DRAFT`.
- Deep-links into the per-section editors (media, documents, amenities, landmarks, milestones, developer link) defined in M1–M8 and [`portal-editors.md`](portal-editors.md).

## M0.4 Profile completeness & publish gate

A pure helper `calculateSocietyCompleteness(society)` -> `{ score: 0–100, missing: string[] }`, composed in `packages/api-client`. Used by the console and as the **publish gate**: a society cannot move to `PUBLISHED` until the required minimum is present (identity + location coordinates + LOP/NOC refs + a hero image, at minimum). Surfaced read-only to society admins in their portal so they know what to complete.

## M0.5 Bulk import (optional accelerator)

`society.importBatch` — **`superAdminProcedure`**: accepts a validated CSV/JSON batch of base society records; **idempotent upsert keyed on `slug`**; always lands in `DRAFT`; returns a per-row report (`created` / `updated` / `skipped` / `error`). Supports a **dry-run** mode that validates without writing. This keeps "one-by-one" fast when a spreadsheet exists, while never publishing unreviewed data.

## M0.6 Reference data (normalization)

To keep filters and slugs consistent across thousands of rows, validate `citySlug` and `authority` against curated reference sets in `packages/types` — `PAKISTAN_CITIES` and `REGULATORY_AUTHORITIES` (CDA, LDA, RDA, FDA, GDA, MDA, PHATA, WDA, etc.), each `{ slug, label }`. Free-text city/authority is rejected unless it matches the reference set (or is added to it). Promote to `City` / `RegulatoryAuthority` tables later if they need their own metadata; curated constants suffice initially (`.cursor/rules/000-core.mdc` — reuse, smallest correct diff).

## M0.7 Directory & read scalability

Replace the full-scan + N+1 pattern in `apps/web/lib/queries.ts`:

- **`society.listSummaries`** — a single **cursor-paginated** procedure (`limit`, `cursor`, filters) returning enriched `SocietySummary` rows. Category aggregates via Prisma `groupBy` and review averages via `aggregate`/`groupBy` in a bounded number of queries — **not** one categories + one reviews query per society.
- **`society.facets`** — one `groupBy` returning city/authority/tier counts, replacing the three separate `society.list()` full scans.
- **Search** — name/city search backed by a Postgres `pg_trgm` GIN index (or full-text), not in-memory `filter`.
- **Indexes** — add `@@index` on `authority`, `verificationTier`, `publishStatus`, `[publishStatus, citySlug]`, and a trigram index on `name`. Keep the existing `citySlug` index.
- **ISR / caching** — cap `generateStaticParams` to the top/most-recent societies; render the long tail on-demand (ISR) and use **on-demand revalidation** (`revalidatePath` / `revalidateTag`) when a society is published or edited, rather than relying solely on a fixed 6h timer across thousands of pages (`.cursor/rules/scalability-and-performance.mdc`).

## Types

`societyPublishStatusSchema`, `society.create` / `setPublishStatus` / `assignAdmin` / `importBatch` input schemas, and reference-data constants (`PAKISTAN_CITIES`, `REGULATORY_AUTHORITIES`) in `packages/types`.

## Acceptance

- An ops/admin user can create a society as `DRAFT`, fill it in over time, see its completeness %, and publish it once the gate passes. Drafts/archived never appear in any public read, the sitemap, or `generateStaticParams`.
- Slug collisions are rejected (`CONFLICT`); bulk import is idempotent and returns a per-row report; dry-run writes nothing.
- City/authority values are validated against the reference set.
- The directory list + facets run in a **bounded** number of queries (no per-society fan-out), are cursor-paginated, and support name/city search via an index.
- Create / publish / archive emit audit ledger events through the standard builder; `docs/architecture/access-rights-matrix.md` updated.

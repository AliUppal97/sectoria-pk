# Society Profile V2 — Build Playbook (Prompt File)

Companion to the split technical spec. The spec **index** is [`docs/architecture/society-profile-v2-spec.md`](architecture/society-profile-v2-spec.md); the detailed parts live under [`docs/architecture/society-profile-v2/`](architecture/society-profile-v2/). Same format as [`docs/session-playbook.md`](session-playbook.md): for **every** session you get the model tier, mode, the exact files to attach, expected rules, a tightened prompt, and a test gate that must pass **before** the next session.

> Golden rule (unchanged): **do not advance until every box in a session's Test Gate is ticked.** A broken foundation package multiplies into every session above it.

> Attach discipline: each session attaches [`society-profile-v2/foundations.md`](architecture/society-profile-v2/foundations.md) **plus only the module/concern file(s) for that session** — not the whole spec. UI sessions also attach the design system.

> **Sub-sessions (S2a, S0b, …):** spawned by `session-ship-review` when a gap is **in the parent session's scope** but no later session will fix it. Run the sub-session after the parent Test Gate passes and **before** the next major session. Sub-sessions use the same format below (Model, Attach, Prompt, Test Gate). Do not advance past a sub-session if its Test Gate is unchecked.

These sessions deliver an **end-to-end society onboarding pipeline** (Session S0: create -> draft -> complete -> publish, with a scalable directory so every society in Pakistan can be added one-by-one) plus the Urban City-grade society profile built on top of it (visual media, documents, rich amenities, connectivity, developer credibility, milestone roadmap, progress galleries, sub-community sections, and a blog) — all **inside the concierge model**: every CTA funnels to a quote request; no self-serve booking; no dealer net/contact exposure.

---

## Model tiers (same map as `session-playbook.md`)

| Tier | Use for |
|---|---|
| **A — Strongest** | Correctness-critical: DB schema + migrations, tRPC guards/transactions, storage signing/auth, anything touching money or sensitive docs |
| **B — Fast/Mid** | Pattern-following UI, CRUD portal pages, blog, SEO scaffolding once a pattern exists |
| **C — Either** | Mechanical scaffolding/config where the spec is exact (default to B) |

**How to set it:** new chat → pick the tier's current top model **before** typing the prompt.

### Session → tier map

| Session | Topic | Tier | Mode |
|---|---|---|---|
| S0 | Society lifecycle, onboarding console, bulk import + directory scalability | **A** | Agent |
| S1 | Types + schema + migrations (data foundation) | **A** | Agent |
| S2 | API routers + concierge/ownership guards | **A** | Agent |
| S2a | Public profile read guards (ship-review gap) | **A** | Agent |
| S3 | Storage adapter + presigned uploads + ADR-009 | **A** | Agent |
| S4 | Media, galleries & virtual tour UI | B | Agent |
| S5 | Documents & downloads UI | B | Agent |
| S6 | Amenities, highlights & connectivity UI | B | Agent |
| S7 | Developer profiles + track-record pages | B | Agent |
| S8 | Milestone roadmap + sub-community/phase sections | B | Agent |
| S9 | Society portal + admin editors | B | Agent |
| S10 | Blog / content hub | B | Agent |
| S11 | SEO, sitemap, JSON-LD + E2E coverage | B | Agent |

---

## Design documentation (attach in UI sessions)

Per `session-playbook.md`: **attach** `@docs/design/Sectoria_Design_System.md` in the UI-heavy sessions (**S0 and S4–S10**) for exact tokens, bento grid, five-states, and trust patterns. S0 attaches it because it builds the admin onboarding console. **Do not attach it** in S1–S3 (data/API/storage) or S11 (SEO/E2E) — it adds context with no benefit there.

The lean rules `ui-design-system-sectoria.mdc` and `ui-ux-excellence-sectoria.mdc` auto-load on `apps/web/app/**` and `packages/ui/**`.

---

## Pre-flight gate (GREEN before S0)

- [ ] On a clean branch off the latest `main`; working tree committed.
- [ ] `pnpm install` clean; `pnpm turbo run test lint typecheck` green at baseline.
- [ ] Read the spec index `@docs/architecture/society-profile-v2-spec.md` and `@docs/architecture/society-profile-v2/foundations.md` — **note M0 is foundational and runs first (Session S0)**.
- [ ] Confirm concierge rule loads: `.cursor/rules/concierge-model.mdc`.
- [ ] Postgres reachable for `prisma migrate dev` (and able to enable the `pg_trgm` extension for M0 search).

**Per-session ritual:** new chat → set model tier → `@`-attach the files listed in that session's **Attach** line → paste the session prompt → run Test Gate → commit → push.

---

# SESSIONS

---

## Session S0 — Society lifecycle, onboarding console & directory scale (foundational)

- **Model:** Tier A
- **Mode:** Agent
- **Attach:** `@docs/architecture/society-profile-v2/foundations.md` + `@docs/architecture/society-profile-v2/m0-onboarding-and-scale.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `database`, `api-trpc`, `middleware-and-guards`, `auth-and-access-control`, `scalability-and-performance`, `concierge-model`, `security`.
- **Why first:** today there is no `society.create`, no draft/publish lifecycle, and the directory does an N+1 fan-out plus three full-table facet scans (`apps/web/lib/queries.ts`). This session makes society data a governed, scalable dataset so every society in Pakistan can be added one-by-one. M1–M8 depend on it.

**Prompt:**
```
@docs/architecture/society-profile-v2/foundations.md @docs/architecture/society-profile-v2/m0-onboarding-and-scale.md @docs/design/Sectoria_Design_System.md

Implement module M0 (the onboarding + scalability foundation). Do it in this order:

1. Lifecycle (M0.1): add SocietyPublishStatus enum (DRAFT/PUBLISHED/ARCHIVED) +
   Society.publishStatus (default DRAFT), publishedAt, createdById. Add the Zod
   schema to packages/types. Migration must BACKFILL existing societies to
   PUBLISHED so the marketplace doesn't go dark. Add @@index([publishStatus,
   citySlug]), and @@index on authority, verificationTier, publishStatus, plus a
   pg_trgm trigram index on name (enable the extension in the migration).
2. Filter ALL public reads to publishStatus=PUBLISHED: society.list, getBySlug,
   the new summary/facet procedures, sitemap.ts, and generateStaticParams.
3. Creation & ownership (M0.2): society.create (opsProcedure; minimal identity;
   slug-unique -> CONFLICT on clash; starts DRAFT), society.setPublishStatus
   (opsProcedure; gated on the completeness check), society.assignAdmin
   (superAdminProcedure). Emit LedgerEvent SOCIETY_CREATED/PUBLISHED/ARCHIVED via
   the standard ledger builder (entityId=societyId) — no ad-hoc audit rows.
4. Completeness (M0.4): pure calculateSocietyCompleteness(society) ->
   {score, missing[]}, used as the publish gate and surfaced read-only to admins.
5. Reference data (M0.6): PAKISTAN_CITIES + REGULATORY_AUTHORITIES ({slug,label})
   in packages/types; validate citySlug/authority on create/import against them.
6. Bulk import (M0.5): society.importBatch (superAdminProcedure) — idempotent
   upsert by slug, always DRAFT, dry-run mode, per-row result report.
7. Scalability (M0.7): replace the N+1 in apps/web/lib/queries.ts with
   society.listSummaries (cursor-paginated; category aggregates via groupBy,
   review averages via aggregate/groupBy) and society.facets (one groupBy for
   city/authority/tier counts). Add index-backed name/city search. Use on-demand
   revalidation (revalidatePath/revalidateTag) when a society is published/edited;
   cap generateStaticParams to the top/most-recent societies.
8. Admin console (M0.3): apps/web/app/(admin)/admin/societies/ — paginated,
   searchable, filterable list with a completeness % column; create wizard
   (saves DRAFT); publish/unpublish/archive with confirm dialogs.

Society creation is ops/platform work — never self-service, never a buyer path.
Update docs/architecture/access-rights-matrix.md with every new mutation. Add
tests: ops-only create, slug CONFLICT, publish gate rejection, draft excluded
from public reads, import idempotency/dry-run, and a query-count assertion that
listSummaries does NOT fan out per society.
```

**Test Gate:**
- [ ] `SocietyPublishStatus` added; migration backfills existing societies to `PUBLISHED`; trigram + new indexes present (reviewed SQL).
- [ ] Public reads, sitemap, and `generateStaticParams` exclude non-`PUBLISHED` societies (test).
- [ ] `society.create` is ops-only, starts `DRAFT`, rejects duplicate slug with `CONFLICT` (test).
- [ ] Publish is blocked until `calculateSocietyCompleteness` passes the minimum (test).
- [ ] `society.assignAdmin` is super-admin-only; portal writes still gated by ownership.
- [ ] `importBatch` is idempotent, dry-run writes nothing, returns a per-row report (test).
- [ ] `listSummaries` is cursor-paginated and runs a **bounded** number of queries — assert no per-society fan-out (query-count test); `facets` uses a single `groupBy`.
- [ ] Name/city search is index-backed (no in-memory full-table filter).
- [ ] Create/publish/archive emit ledger events via the standard builder; `access-rights-matrix.md` updated.
- [ ] Admin console can create a `DRAFT`, show completeness %, and publish; design tokens only.
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Commit + push: `feat(society): lifecycle, onboarding console, bulk import, and scalable directory (M0)`

---

## Session S1 — Types + schema + migrations (data foundation)

- **Model:** Tier A
- **Mode:** Agent
- **Attach:** `@docs/architecture/society-profile-v2-spec.md` + `@docs/architecture/society-profile-v2/foundations.md` (open each `society-profile-v2/m1`–`m8` file for its Data model section)
- **Rules expected to load:** `database` (`packages/database/**`), `oop-and-domain-modeling`, `architecture`, `concierge-model`.

**Prompt:**
```
@docs/architecture/society-profile-v2-spec.md @docs/architecture/society-profile-v2/foundations.md

Implement the M1–M8 data foundation. Read the Data model section of each module
file under docs/architecture/society-profile-v2/ (m1-media-galleries,
m2-documents, m3-amenities-highlights, m4-location-connectivity,
m5-developer-profiles, m6-milestone-roadmap, m8-blog-content-hub) and the
additive summary in foundations.md §3. This session is types + schema +
migrations ONLY — no routers, no UI. (M0's lifecycle fields, indexes, and
reference data were added in S0 — do not duplicate them; this session adds the
M1–M8 models.)

1. packages/types: add Zod schemas + `as const` enums + z.infer types for:
   society-media (SocietyMediaKind), society-document (SocietyDocumentKind),
   society-feature (AmenityFeature, SocietyHighlight),
   nearby-landmark (LandmarkCategory), developer (Developer, DeveloperProject),
   society-milestone (MilestoneStatus), article. Extend societySchema with
   virtualTourUrl?, promoVideoUrl?, developerId?. Export all from the barrel
   index.ts. Mirror Prisma enums EXACTLY.
2. packages/database/prisma/schema.prisma: add the new models, enums, and the
   new Society fields + relations from foundations.md §3. cuid() ids, @@index
   on every FK, Decimal for money/area, enums for closed sets. Keep existing
   `amenities String[]` and `heroImageUrl` — additive only, no drops/renames.
3. Generate ONE migration per logical module group (media, document, feature,
   landmark, developer, milestone, article) — do NOT bundle unrelated changes.
   Inspect each generated SQL for accidental destructive diffs before committing.
4. Extend seed.ts with realistic Pakistani-context fixtures for every new model
   so a seeded society profile looks complete.

Do not expose dealer net/commission anywhere. Do not add plaintext PII columns.
```

**Test Gate:**
- [ ] `packages/types` exports every new schema + type from the barrel; enums mirror Prisma 1:1.
- [ ] `pnpm --filter @sectoria/types build` clean.
- [ ] `prisma migrate dev` applies; generated SQL reviewed — no column drop/recreate of existing fields.
- [ ] `prisma generate` succeeds; client types include new models.
- [ ] `pnpm --filter @sectoria/database exec prisma db seed` runs; new fixtures present.
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Commit + push: `feat(db): society profile v2 data model — media, docs, amenities, landmarks, developers, milestones, articles`

---

## Session S2 — API routers + guards

- **Model:** Tier A
- **Mode:** Agent
- **Attach:** `@docs/architecture/society-profile-v2-spec.md` + `@docs/architecture/society-profile-v2/foundations.md` (open each `m1`–`m8` file for its API section)
- **Rules expected to load:** `api-trpc`, `middleware-and-guards`, `auth-and-access-control`, `concierge-model`, `security`.

**Prompt:**
```
@docs/architecture/society-profile-v2-spec.md @docs/architecture/society-profile-v2/foundations.md

Add the tRPC routers for M1–M8. Read the API section of each module file under
docs/architecture/society-profile-v2/ and the procedure mapping in foundations.md
§1.1/§2. One router file per area under packages/api-client/src/routers/: media,
document, society-feature (amenities + highlights), landmark, developer,
milestone, article. Merge into the root router.

Rules:
- Public reads (consumed by the profile) use publicProcedure with DTO mappers
  that serialize Date/Decimal (follow society-update.router.ts).
- Society-owned writes use societyAdminProcedure + assertSocietyOwnership.
- Developer and Article authoring use superAdminProcedure (platform-curated).
- Every input schema imported from @sectoria/types — no inline shapes.
- Re-derive identity from ctx.session; typed TRPCError codes.
- Document.listForSociety returns only isPublic docs; private docs require auth
  before any URL is returned (URL minting itself lands in S3 — stub the call now).
- NEVER return dealerNetPkr/spreadPkr/commission or dealer contact in any payload.

Add unit tests for each router (ownership rejection, public/private filtering,
super-admin-only authoring) following existing __tests__ patterns. Update
docs/architecture/access-rights-matrix.md with a row per new mutation.
```

**Test Gate:**
- [ ] One router file per area, merged into the root router.
- [ ] Ownership guard rejects cross-society writes (test asserts FORBIDDEN).
- [ ] `Document.listForSociety` excludes private docs for public callers (test).
- [ ] Developer/Article authoring rejects non-super-admin (test).
- [ ] No dealer net/commission/contact field appears in any buyer-facing payload (grep + test).
- [ ] `access-rights-matrix.md` updated.
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Commit + push: `feat(api): society profile v2 routers with ownership + concierge guards`
- [ ] **S2a** complete if spawned by ship-review (public `publishStatus` guards)

---

## Session S2a — Public profile read guards (ship-review gap)

- **Model:** Tier A
- **Mode:** Agent
- **Parent:** S2 — run after S2 Test Gate passes; complete **before S3**
- **Attach:** `@docs/architecture/society-profile-v2/foundations.md` + `@docs/architecture/society-profile-v2/m0-onboarding-and-scale.md`
- **Rules expected to load:** `api-trpc`, `middleware-and-guards`, `auth-and-access-control`, `security`.

**Prompt:**
```
@docs/architecture/society-profile-v2/foundations.md @docs/architecture/society-profile-v2/m0-onboarding-and-scale.md

Close the S2 ship-review gap: every new public profile read must respect M0's
publishStatus rule (foundations.md §1.1 — publicProcedure reads filtered to
PUBLISHED). S3 owns real storage signing; this session is guards + DTO hygiene only.

1. Add a shared helper in packages/api-client/src/lib/ (e.g.
   assert-published-society.ts): given societyId, load publishStatus; if not
   PUBLISHED, throw TRPCError NOT_FOUND (same semantics as society.getBySlug —
   draft/archived indistinguishable from missing for public callers).
2. Call it at the start of every public listForSociety* query:
   media.listForSociety, document.listForSociety, societyFeature.listAmenitiesForSociety,
   societyFeature.listHighlightsForSociety, landmark.listForSociety,
   milestone.listForSociety. Do NOT add publish checks to societyAdminProcedure
   admin list endpoints.
3. In society-profile-dto.ts: toMediaPublicDto must not expose storageKey on the
   public wire (mirror toDocumentPublicDto — return url only). Admin DTOs keep
   storageKey.
4. Tests in society-profile-v2.router.test.ts: seed a DRAFT society with media/docs;
   assert public listForSociety returns NOT_FOUND or empty per your helper choice
   (match getBySlug: NOT_FOUND on the society lookup inside helper). Assert public
   media payloads have url and no storageKey.

Do not implement presigned URLs, upload flows, or CSP changes — those land in S3.
Do not add UI. Smallest correct diff.
```

**Test Gate:**
- [ ] Shared publishStatus guard used by all six public listForSociety* procedures.
- [ ] DRAFT society profile content not returned to unauthenticated callers (test).
- [ ] Public media DTO omits storageKey; admin DTO still includes it.
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Commit + push: `fix(api): gate public profile v2 reads on publishStatus + strip public media storageKey`

---

## Session S3 — Storage adapter + presigned uploads (ADR-009)

- **Model:** Tier A
- **Mode:** Agent
- **Attach:** `@docs/architecture/society-profile-v2/foundations.md` + `@docs/architecture/society-profile-v2/storage.md`
- **Rules expected to load:** `security`, `architecture`, `api-trpc`, `dependency-management`.

**Prompt:**
```
@docs/architecture/society-profile-v2/foundations.md @docs/architecture/society-profile-v2/storage.md

Implement media/document storage per storage.md. Write ADR-009
(docs/architecture/ADR-009-media-document-storage.md) recording the decision.

1. Storage adapter (apps/web/lib/storage or packages/storage) with a small
   interface: getUploadUrl(key, contentType), getSignedDownloadUrl(key, ttl),
   getPublicUrl(key). Provide an S3-compatible implementation AND a local
   filesystem/mock implementation selected by env so dev/CI need no cloud creds.
   Inject the client; no inline SDK calls in routers.
2. Wire the upload flow: a societyAdminProcedure mints a presigned PUT after
   validating content-type against an allow-list (pdf/jpg/png) and a size cap.
   Public media resolves to a public/CDN URL; private docs (LOP/NOC, isPublic=
   false) mint a short-lived signed URL only after an auth/ownership check.
3. Add storage env vars to .env.example (blank by default). Add the storage/CDN
   host to img-src and connect-src, and the virtual-tour host to frame-src, in
   next.config.ts CSP — keep the policy conservative.
4. Verify the dependency-baseline before adding any SDK; pin the exact version.

No PII in object keys or filenames. Tests: allow-list rejection, size-cap
rejection, signed-URL expiry, private-doc auth requirement.
```

**Test Gate:**
- [ ] ADR-009 written and linked from `storage.md` / the spec index.
- [ ] Mock/local adapter works with no cloud creds (dev + CI).
- [ ] Upload rejects disallowed content-type and oversized files (typed error, tested).
- [ ] Private-doc URL requires auth/ownership; signed URLs expire (tested).
- [ ] `.env.example` updated; CSP `img-src`/`connect-src`/`frame-src` updated in `next.config.ts`.
- [ ] New dependency (if any) matches `docs/architecture/dependency-baseline.md`.
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Commit + push: `feat(storage): object-storage adapter with presigned uploads + signed downloads (ADR-009)`

---

## Session S4 — Media, galleries & virtual tour UI

- **Model:** Tier B
- **Mode:** Agent
- **Attach:** `@docs/architecture/society-profile-v2/foundations.md` + `@docs/architecture/society-profile-v2/m1-media-galleries.md` + `@docs/architecture/society-profile-v2/storage.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `nextjs-app-router`, `concierge-model`.

**Prompt:**
```
@docs/architecture/society-profile-v2/m1-media-galleries.md @docs/architecture/society-profile-v2/foundations.md @docs/design/Sectoria_Design_System.md

Build the media UI per M1. Components under apps/web/components/marketplace/:
- Render the society hero from SocietyMedia(kind=HERO) (fallback heroImageUrl)
  with the verification badge overlaid; next/image with sizes + blur, no CLS.
- society-gallery.tsx: responsive grid + accessible lightbox (client, dynamic
  import with skeleton like society-location-map-dynamic.tsx). Keyboard nav,
  focus trap, Esc to close, alt text.
- society-progress-gallery.tsx: kind=PROGRESS ordered by capturedAt, newest first,
  with month/year labels.
- society-virtual-tour.tsx + promo video: click-to-load iframe (no autoload).
Wire into the society profile page. Use design tokens only — no inline hex or
arbitrary spacing. Implement all five states (empty falls back to current
initials placeholder). CTAs stay concierge — no booking buttons.
```

**Test Gate:**
- [ ] Hero renders real media when present; clean placeholder when absent; no layout shift.
- [ ] Lightbox is keyboard- and screen-reader-accessible (focus trap, alt, Esc).
- [ ] Progress photos ordered newest-first with date labels.
- [ ] Virtual tour/video are click-to-load (no third-party autoload); protects LCP.
- [ ] No inline hex/arbitrary spacing (design-system rule clean).
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Commit + push: `feat(web): society hero, gallery lightbox, progress gallery, virtual tour`

---

## Session S5 — Documents & downloads UI

- **Model:** Tier B
- **Mode:** Agent
- **Attach:** `@docs/architecture/society-profile-v2/foundations.md` + `@docs/architecture/society-profile-v2/m2-documents.md` + `@docs/architecture/society-profile-v2/storage.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `concierge-model`, `security`.

**Prompt:**
```
@docs/architecture/society-profile-v2/m2-documents.md @docs/architecture/society-profile-v2/foundations.md @docs/design/Sectoria_Design_System.md

Build society-documents.tsx per M2: download cards grouped by kind
(master plan, brochure, payment plan, LOP, NOC), each showing icon, title,
file size, and content type, linking to the signed URL with rel="noopener" and
the download attribute. Public profile lists only public documents. Wire into the
profile page near the trust/compliance bento ("View PDF" parity). Five states;
design tokens only. No PII in displayed filenames.
```

**Test Gate:**
- [ ] Only public documents appear on the public profile.
- [ ] Each card shows file size + type before download; links use signed URLs.
- [ ] Empty state hidden cleanly when a society has no documents.
- [ ] Design-system tokens only; accessible link semantics.
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Commit + push: `feat(web): society document downloads (master plan, brochure, payment plan, LOP/NOC)`

---

## Session S6 — Amenities, highlights & connectivity UI

- **Model:** Tier B
- **Mode:** Agent
- **Attach:** `@docs/architecture/society-profile-v2/foundations.md` + `@docs/architecture/society-profile-v2/m3-amenities-highlights.md` + `@docs/architecture/society-profile-v2/m4-location-connectivity.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `concierge-model`.

**Prompt:**
```
@docs/architecture/society-profile-v2/m3-amenities-highlights.md @docs/architecture/society-profile-v2/m4-location-connectivity.md @docs/architecture/society-profile-v2/foundations.md @docs/design/Sectoria_Design_System.md

Build per M3 + M4:
- society-amenities.tsx: rich bento amenity cards (icon/image + title +
  description) from AmenityFeature; fall back to the existing amenities[] pills
  when no rich features exist.
- society-highlights.tsx: stat strip from SocietyHighlight near the hero/trust
  bento ("Driving results" style).
- society-connectivity.tsx: nearby landmarks grouped by category with drive-times,
  rendered INSIDE the existing SocietyLocationSection alongside the Leaflet map
  and opt-in distance. Admin-entered values only — no Places API (ADR-008). Keep
  the existing Google Maps deep link.
Design tokens only; five states; concierge CTAs unchanged.
```

**Test Gate:**
- [ ] Rich amenity cards render when present; pill fallback works when not.
- [ ] Highlights render responsively with tokens (no inline hex/spacing).
- [ ] Connectivity list shows category icons + drive-times; degrades to map-only cleanly.
- [ ] No external Places/Maps API call introduced (ADR-008 intact).
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Commit + push: `feat(web): rich amenities, stat highlights, and location connectivity`

---

## Session S7 — Developer profiles + track-record pages

- **Model:** Tier B
- **Mode:** Agent
- **Attach:** `@docs/architecture/society-profile-v2/foundations.md` + `@docs/architecture/society-profile-v2/m5-developer-profiles.md` + `@docs/architecture/society-profile-v2/seo.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `nextjs-app-router`, `seo`, `concierge-model`.

**Prompt:**
```
@docs/architecture/society-profile-v2/m5-developer-profiles.md @docs/architecture/society-profile-v2/seo.md @docs/architecture/society-profile-v2/foundations.md @docs/design/Sectoria_Design_System.md

Build per M5:
- A "Developer" credibility block on the society profile showing the developer
  (logo, name, short bio) and linking to their page.
- New public route apps/web/app/(marketplace)/developers/[slug]/page.tsx (ISR):
  developer bio, logo, track-record portfolio grid (DeveloperProject), and the
  list of their societies on Sectoria. Organization JSON-LD.
This is builder credibility, NOT a dealer directory — no pricing, no contact-to-
transact path; the only conversion CTA is the concierge quote request. Design
tokens, five states.
```

**Test Gate:**
- [ ] Society profile shows developer block linking to the developer page (when a developer is set).
- [ ] Developer page lists projects + associated societies with ISR.
- [ ] `Organization` JSON-LD present and valid.
- [ ] No pricing/contact-to-transact path; only the concierge CTA converts.
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Commit + push: `feat(web): developer profiles with project track record`

---

## Session S8 — Milestone roadmap + sub-community/phase sections

- **Model:** Tier B
- **Mode:** Agent
- **Attach:** `@docs/architecture/society-profile-v2/foundations.md` + `@docs/architecture/society-profile-v2/m6-milestone-roadmap.md` + `@docs/architecture/society-profile-v2/m7-phase-sections.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `concierge-model`.

**Prompt:**
```
@docs/architecture/society-profile-v2/m6-milestone-roadmap.md @docs/architecture/society-profile-v2/m7-phase-sections.md @docs/architecture/society-profile-v2/foundations.md @docs/design/Sectoria_Design_System.md

Build per M6 + M7:
- society-roadmap.tsx: structured milestone timeline (month-year nodes, status
  completed/in-progress/planned), reusing the visual language of
  society-updates-timeline.tsx, rendered ABOVE the existing news timeline.
- society-phases.tsx: group existing inventory by phase, each phase showing its
  blocks, category cards, starting price, availability, and an optional phase
  image. Derive grouping at read time; keep the flat category grid available.
Concierge quote CTA unchanged. Design tokens; five states.
```

**Test Gate:**
- [ ] Roadmap renders milestones ordered by date with clear status states; coexists with the news timeline.
- [ ] Inventory groups by phase with per-phase summary; flat grid still available.
- [ ] Empty states hidden cleanly.
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Commit + push: `feat(web): milestone roadmap and sub-community phase sections`

---

## Session S9 — Society portal + admin editors

- **Model:** Tier B
- **Mode:** Agent
- **Attach:** `@docs/architecture/society-profile-v2/foundations.md` + `@docs/architecture/society-profile-v2/portal-editors.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `auth-and-access-control`, `concierge-model`, `security`.

**Prompt:**
```
@docs/architecture/society-profile-v2/portal-editors.md @docs/architecture/society-profile-v2/foundations.md @docs/design/Sectoria_Design_System.md

Build the editing surfaces per portal-editors.md.
Society portal (apps/web/app/(society)/society-portal/, nav in
components/society/society-shell.tsx), all societyAdminProcedure + ownership:
- Media (upload/reorder hero, gallery, progress with capture date, floorplans)
- Documents (manage + public/private toggle)
- Amenities & highlights
- Location (extend the existing form with nearby landmarks)
- Roadmap (milestone CRUD with date + status)
- Profile basics: expose the currently seed-only editable fields (description,
  amenities, developmentStage, developmentPct, virtualTourUrl, promoVideoUrl)
Admin portal (apps/web/app/(admin)/), superAdminProcedure:
- Developers + their projects; Articles authoring (lands fully in S10).
Use the presigned-upload flow from S3. Money/sensitive-doc actions use confirm
dialogs, not toasts. Five states; design tokens.
```

**Test Gate:**
- [ ] Society admin can create/reorder/delete media, docs, amenities, highlights, landmarks, milestones — scoped to their own society only.
- [ ] Previously seed-only fields are now editable in the portal.
- [ ] Developers/articles editable only in admin portal (super-admin).
- [ ] Uploads go through the presigned flow; destructive actions confirm.
- [ ] Cross-society write attempts are rejected (manual check or test).
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Commit + push: `feat(web): society + admin editors for profile v2 content`

---

## Session S10 — Blog / content hub

- **Model:** Tier B
- **Mode:** Agent
- **Attach:** `@docs/architecture/society-profile-v2/foundations.md` + `@docs/architecture/society-profile-v2/m8-blog-content-hub.md` + `@docs/architecture/society-profile-v2/seo.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `nextjs-app-router`, `seo`, `security`.

**Prompt:**
```
@docs/architecture/society-profile-v2/m8-blog-content-hub.md @docs/architecture/society-profile-v2/seo.md @docs/architecture/society-profile-v2/foundations.md @docs/design/Sectoria_Design_System.md

Build per M8:
- apps/web/app/(marketplace)/blog/page.tsx (published list, ISR) and
  blog/[slug]/page.tsx (article, ISR). Render markdown SERVER-SIDE through a
  sanitizer (no raw HTML injection). Unpublished articles never appear publicly.
- Optional "Related reading" block on society/developer profiles when associated
  articles exist.
Article JSON-LD + per-page metadata via lib/seo.ts. Design tokens; five states.
```

**Test Gate:**
- [ ] Blog index + article pages render published markdown safely (sanitized).
- [ ] Unpublished articles are not reachable publicly.
- [ ] `Article` JSON-LD + canonical metadata present.
- [ ] Related-reading block appears only when associated articles exist.
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Commit + push: `feat(web): blog / content hub with sanitized markdown and SEO`

---

## Session S11 — SEO, sitemap, JSON-LD + E2E

- **Model:** Tier B
- **Mode:** Agent
- **Attach:** `@docs/architecture/society-profile-v2/foundations.md` + `@docs/architecture/society-profile-v2/seo.md`
- **Rules expected to load:** `seo`, `testing` (`e2e/**`, `*.spec.ts`), `nextjs-app-router`, `concierge-model`.
- **Design:** no design-spec attachment — this session validates flows/SEO, not visuals.

**Prompt:**
```
@docs/architecture/society-profile-v2/seo.md @docs/architecture/society-profile-v2/foundations.md

Finalize SEO and tests per seo.md and the acceptance criteria in foundations.md §5.
1. lib/seo.ts: add ImageObject (hero/gallery), VideoObject (virtual tour/promo),
   and confirm Organization (developer) + Article builders. Render through the
   shared <JsonLd> component — never inline <script>.
2. sitemap.ts: add developer pages and published articles; keep society/category.
   Only publishStatus=PUBLISHED societies appear.
3. Make the society hero the society OG image; give blog/developer pages their own OG.
4. Extend the Playwright suite (e2e/) to cover the enriched profile against seeded
   mock data: open a society profile and assert the hero, a gallery item, a
   document download link, a nearby landmark, the developer block, and a milestone
   are visible; assert every primary CTA leads to the quote-request flow and that
   NO "Book Now"/dealer-contact path is present.

Run against MOCK adapters only — no real cloud/storage/government calls in CI.
```

**Test Gate:**
- [ ] JSON-LD for image/video/organization/article validates; no inline `<script>`.
- [ ] Sitemap includes developer pages + published articles; excludes non-published societies.
- [ ] OG images correct for society/developer/blog.
- [ ] Playwright asserts enriched profile sections render and CTAs are concierge-only (no booking/dealer path).
- [ ] E2E uses mock adapters only; CI (`.github/workflows/ci.yml`) runs the suite.
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Commit + push: `feat(seo,e2e): profile v2 structured data, sitemap, and critical-path coverage`

---

## Quality Gate — run between EVERY session

```bash
pnpm turbo run test lint typecheck
```

All three must pass before you commit and move on. If anything fails, paste the **exact** red error lines (not the whole log) into the current chat and ask Cursor to fix it before advancing.

## Fast triage

| Symptom | Action |
|---|---|
| `prisma migrate dev` proposes a destructive diff | STOP → "make it additive; do not drop/recreate existing columns (database.mdc §Migrations)" |
| Dealer net/commission leaks into a buyer payload | STOP → "violates concierge-model.mdc — strip dealerNetPkr/spreadPkr/commission and dealer contact from this response" |
| A new CTA points at a booking/checkout route | "violates concierge-model.mdc — route to the QuoteRequestForm / advisor flow instead" |
| Upload accepts arbitrary file types | "add the content-type allow-list + size cap on the server before minting a presigned URL (security.mdc)" |
| Private LOP/NOC served via public URL | STOP → "private docs must require auth/ownership before a short-lived signed URL is minted (storage.md)" |
| Inline hex / arbitrary spacing in UI | "violates ui-design-system-sectoria.mdc — add a token to theme.css and use it" |
| Third-party iframe/video autoloads | "make virtual-tour/video click-to-load and add the host to CSP frame-src" |
| Directory read fans out per society | STOP → "violates scalability-and-performance.mdc — use society.listSummaries with groupBy aggregates + cursor pagination, not an N+1 fan-out (m0-onboarding-and-scale.md M0.7)" |
| Draft society appears publicly | STOP → "all public reads, sitemap, and generateStaticParams must filter publishStatus=PUBLISHED (m0-onboarding-and-scale.md M0.1)" |
| `society.create` reachable by a buyer/society self-service | STOP → "society onboarding is opsProcedure only — never a buyer path (m0-onboarding-and-scale.md M0.2)" |
| Free-text city/authority entered | "validate against PAKISTAN_CITIES / REGULATORY_AUTHORITIES reference sets (m0-onboarding-and-scale.md M0.6)" |
| New package version guessed | `cat docs/architecture/dependency-baseline.md` → use the pinned version |

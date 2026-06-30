# Society Profile V2 — Build Playbook (Prompt File)

Companion to the technical spec [`docs/architecture/society-profile-v2-spec.md`](architecture/society-profile-v2-spec.md). Same format as [`docs/session-playbook.md`](session-playbook.md): for **every** session you get the model tier, mode, attachments, expected rules, a tightened prompt, and a test gate that must pass **before** the next session.

> Golden rule (unchanged): **do not advance until every box in a session's Test Gate is ticked.** A broken foundation package multiplies into every session above it.

These sessions deliver the Urban City-grade society profile (visual media, documents, rich amenities, connectivity, developer credibility, milestone roadmap, progress galleries, sub-community sections, and a blog) **inside the concierge model** — every CTA funnels to a quote request; no self-serve booking; no dealer net/contact exposure.

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
| S1 | Types + schema + migrations (data foundation) | **A** | Agent |
| S2 | API routers + concierge/ownership guards | **A** | Agent |
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

Per `session-playbook.md`: **attach** `@docs/design/Sectoria_Design_System.md` in the UI-heavy sessions (**S4–S10**) for exact tokens, bento grid, five-states, and trust patterns. **Do not attach it** in S1–S3 (data/API/storage) or S11 (SEO/E2E) — it adds context with no benefit there.

The lean rules `ui-design-system-sectoria.mdc` and `ui-ux-excellence-sectoria.mdc` auto-load on `apps/web/app/**` and `packages/ui/**`.

---

## Pre-flight gate (GREEN before S1)

- [ ] On a clean branch off the latest `main`; working tree committed.
- [ ] `pnpm install` clean; `pnpm turbo run test lint typecheck` green at baseline.
- [ ] Read the spec `@docs/architecture/society-profile-v2-spec.md` end-to-end.
- [ ] Confirm concierge rule loads: `.cursor/rules/concierge-model.mdc`.
- [ ] Postgres reachable for `prisma migrate dev`.

**Per-session ritual:** new chat → set model tier → `@`-attach `@docs/architecture/society-profile-v2-spec.md` (UI sessions also attach `@docs/design/Sectoria_Design_System.md`) → paste the session prompt → run Test Gate → commit → push.

---

# SESSIONS

---

## Session S1 — Types + schema + migrations (data foundation)

- **Model:** Tier A
- **Mode:** Agent
- **Attach:** `@docs/architecture/society-profile-v2-spec.md`
- **Rules expected to load:** `database` (`packages/database/**`), `oop-and-domain-modeling`, `architecture`, `concierge-model`.

**Prompt:**
```
@docs/architecture/society-profile-v2-spec.md

Implement the Society Profile V2 data foundation per spec §3 and §8. This
session is types + schema + migrations ONLY — no routers, no UI.

1. packages/types: add Zod schemas + `as const` enums + z.infer types for:
   society-media (SocietyMediaKind), society-document (SocietyDocumentKind),
   society-feature (AmenityFeature, SocietyHighlight),
   nearby-landmark (LandmarkCategory), developer (Developer, DeveloperProject),
   society-milestone (MilestoneStatus), article. Extend societySchema with
   virtualTourUrl?, promoVideoUrl?, developerId?. Export all from the barrel
   index.ts. Mirror Prisma enums EXACTLY.
2. packages/database/prisma/schema.prisma: add the 9 new models, 4 new enums,
   and the 3 new Society fields + relations from spec §8. cuid() ids, @@index
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
- **Attach:** `@docs/architecture/society-profile-v2-spec.md`
- **Rules expected to load:** `api-trpc`, `middleware-and-guards`, `auth-and-access-control`, `concierge-model`, `security`.

**Prompt:**
```
@docs/architecture/society-profile-v2-spec.md

Add the tRPC routers for Society Profile V2 per spec §3 and §4. One router file
per area under packages/api-client/src/routers/: media, document, society-feature
(amenities + highlights), landmark, developer, milestone, article. Merge into the
root router.

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

---

## Session S3 — Storage adapter + presigned uploads (ADR-009)

- **Model:** Tier A
- **Mode:** Agent
- **Attach:** `@docs/architecture/society-profile-v2-spec.md`
- **Rules expected to load:** `security`, `architecture`, `api-trpc`, `dependency-management`.

**Prompt:**
```
@docs/architecture/society-profile-v2-spec.md

Implement media/document storage per spec §7. Write ADR-009
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
- [ ] ADR-009 written and linked from the spec.
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
- **Attach:** `@docs/architecture/society-profile-v2-spec.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `nextjs-app-router`, `concierge-model`.

**Prompt:**
```
@docs/architecture/society-profile-v2-spec.md @docs/design/Sectoria_Design_System.md

Build the media UI per spec M1. Components under apps/web/components/marketplace/:
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
- **Attach:** `@docs/architecture/society-profile-v2-spec.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `concierge-model`, `security`.

**Prompt:**
```
@docs/architecture/society-profile-v2-spec.md @docs/design/Sectoria_Design_System.md

Build society-documents.tsx per spec M2: download cards grouped by kind
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
- **Attach:** `@docs/architecture/society-profile-v2-spec.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `concierge-model`.

**Prompt:**
```
@docs/architecture/society-profile-v2-spec.md @docs/design/Sectoria_Design_System.md

Build per spec M3 + M4:
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
- **Attach:** `@docs/architecture/society-profile-v2-spec.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `nextjs-app-router`, `seo`, `concierge-model`.

**Prompt:**
```
@docs/architecture/society-profile-v2-spec.md @docs/design/Sectoria_Design_System.md

Build per spec M5:
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
- **Attach:** `@docs/architecture/society-profile-v2-spec.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `concierge-model`.

**Prompt:**
```
@docs/architecture/society-profile-v2-spec.md @docs/design/Sectoria_Design_System.md

Build per spec M6 + M7:
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
- **Attach:** `@docs/architecture/society-profile-v2-spec.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `auth-and-access-control`, `concierge-model`, `security`.

**Prompt:**
```
@docs/architecture/society-profile-v2-spec.md @docs/design/Sectoria_Design_System.md

Build the editing surfaces per spec §5.
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
- **Attach:** `@docs/architecture/society-profile-v2-spec.md` + `@docs/design/Sectoria_Design_System.md`
- **Rules expected to load:** `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `nextjs-app-router`, `seo`, `security`.

**Prompt:**
```
@docs/architecture/society-profile-v2-spec.md @docs/design/Sectoria_Design_System.md

Build per spec M8:
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
- **Attach:** `@docs/architecture/society-profile-v2-spec.md`
- **Rules expected to load:** `seo`, `testing` (`e2e/**`, `*.spec.ts`), `nextjs-app-router`, `concierge-model`.
- **Design:** no design-spec attachment — this session validates flows/SEO, not visuals.

**Prompt:**
```
@docs/architecture/society-profile-v2-spec.md

Finalize SEO and tests per spec §6 and §10.
1. lib/seo.ts: add ImageObject (hero/gallery), VideoObject (virtual tour/promo),
   and confirm Organization (developer) + Article builders. Render through the
   shared <JsonLd> component — never inline <script>.
2. sitemap.ts: add developer pages and published articles; keep society/category.
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
- [ ] Sitemap includes developer pages + published articles.
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
| Private LOP/NOC served via public URL | STOP → "private docs must require auth/ownership before a short-lived signed URL is minted (spec §2/§7)" |
| Inline hex / arbitrary spacing in UI | "violates ui-design-system-sectoria.mdc — add a token to theme.css and use it" |
| Third-party iframe/video autoloads | "make virtual-tour/video click-to-load and add the host to CSP frame-src" |
| New package version guessed | `cat docs/architecture/dependency-baseline.md` → use the pinned version |

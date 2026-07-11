# Society Profile V2 — Technical Specification (Index)

**Status:** Implemented
**Date:** 2026-06-30
**Owner:** Marketplace / Society experience
**Related:** [ADR-007 (concierge pivot)](ADR-007-concierge-pivot.md), [ADR-008 (society profile maps)](ADR-008-society-profile-maps.md), [ADR-009 (media & document storage)](ADR-009-media-document-storage.md)
**Build prompts:** [`docs/society-profile-v2-playbook.md`](../society-profile-v2-playbook.md)

> This spec is **split into focused files** under [`society-profile-v2/`](society-profile-v2/) so each build session attaches only the slice it needs (instead of one large document). Start with [`foundations.md`](society-profile-v2/foundations.md), then the relevant module/concern file. The playbook's per-session **Attach** lines tell you exactly which files to load.

---

## 1. Context

Sectoria's public society profile (`apps/web/app/(marketplace)/societies/[city]/[society]/page.tsx`) is information-rich on **trust and compliance** (verification tier, LOP/NOC references, payment-plan matrix, booking status, map + land area, updates timeline, reviews) but thin on the **visual, narrative, and credibility** content buyers expect from a modern housing-society site. It also has **no way to onboard societies at scale** (no `society.create`, no draft/publish lifecycle, an N+1 directory).

The benchmark is **Urban City Lahore** (`urbancitylahore.com`). This spec closes the gap between what Sectoria *models* and what it *shows*, and makes society data a governed, scalable dataset — all strictly inside the concierge product model.

### 1.1 Urban City benchmark — what they surface that we do not

| Urban City feature | Sectoria today |
|---|---|
| Cinematic hero + photo galleries | `heroImageUrl` modeled but **not rendered**; no gallery model |
| Dated development-progress photo galleries ("Progress You Can See") | Text-only `SocietyUpdate` timeline |
| Downloadable master-plan / brochure / payment-plan PDFs ("View PDF") | Not modeled |
| Rich amenity cards (image + title + description) | Plain `amenities String[]` pills |
| Nearby landmarks with drive-times + key routes | Map pin + opt-in distance only |
| Developer/builder profile + past-project track record | No developer entity at all |
| Structured milestone roadmap with dates | `SocietyUpdate` only (unstructured news) |
| Sub-community / phase destinations | `phase`/`block` strings on categories |
| Stats / achievement highlights | `developmentStage` + `developmentPct` only |
| Authorized sales partners | `SocietyPartnerAuthorization` exists but hidden |
| Blog / SEO content hub | None |
| Virtual tour / video | None |
| **Add every society one-by-one at scale** | **No `society.create`, no draft/publish, N+1 directory** |

### 1.2 Goals

1. Give buyers **maximum decision-useful information** on a society profile: visuals, documents, amenities, location context, developer credibility, milestones, and live progress.
2. Deliver it with **best-in-class UI/UX** consistent with the Sectoria design system (bento layout, five-states discipline, trust patterns, PKR/CNIC formatting).
3. Keep every change **additive and backward-compatible** at the data layer.
4. Make society data a **governed, scalable dataset**: every society in Pakistan can be onboarded one-by-one (draft -> review -> publish) without leaking incomplete profiles or degrading directory performance as the row count grows into the thousands. This is **foundational** — see M0.

### 1.3 Non-goals (hard constraints)

- **No self-serve "Book Now".** Every CTA funnels to the concierge flow: compare -> request quote -> advisor. (`.cursor/rules/concierge-model.mdc`)
- **No dealer exposure.** Authorized sales partners may be displayed only as a *trust signal*, gated behind a feature flag, and must never expose `dealerNetPkr`, `spreadPkr`, dealer phone/email, or any buyer↔dealer contact path.
- **No paid map/Places API.** Maps stay Leaflet/OSM per ADR-008; nearby landmarks are admin-entered, not fetched from Google Places.
- **No new plaintext PII columns** anywhere (`.cursor/rules/database.mdc`).

---

## 2. Document map

**Always read first:** [`foundations.md`](society-profile-v2/foundations.md) — architecture/layering, concierge & security alignment, the additive data-model summary, rollout, and the feature-complete acceptance definition.

### Modules

| Module | File | Build sessions |
|---|---|---|
| M0 — Society lifecycle, onboarding & directory scale (foundational) | [m0-onboarding-and-scale.md](society-profile-v2/m0-onboarding-and-scale.md) | S0 |
| M1 — Visual media, galleries & virtual tour | [m1-media-galleries.md](society-profile-v2/m1-media-galleries.md) | S1, S2, S4 |
| M2 — Documents & downloads | [m2-documents.md](society-profile-v2/m2-documents.md) | S1, S2, S5 |
| M3 — Rich amenities & stat highlights | [m3-amenities-highlights.md](society-profile-v2/m3-amenities-highlights.md) | S1, S2, S6 |
| M4 — Location & connectivity | [m4-location-connectivity.md](society-profile-v2/m4-location-connectivity.md) | S1, S2, S6 |
| M5 — Developer / builder profiles | [m5-developer-profiles.md](society-profile-v2/m5-developer-profiles.md) | S1, S2, S7 |
| M6 — Milestone roadmap | [m6-milestone-roadmap.md](society-profile-v2/m6-milestone-roadmap.md) | S1, S2, S8 |
| M7 — Sub-community / phase sections | [m7-phase-sections.md](society-profile-v2/m7-phase-sections.md) | S8 |
| M8 — Blog / SEO content hub | [m8-blog-content-hub.md](society-profile-v2/m8-blog-content-hub.md) | S1, S2, S10 |

### Cross-cutting concerns

| Concern | File | Build sessions |
|---|---|---|
| Media & document storage (ADR-009) | [storage.md](society-profile-v2/storage.md) | S3 (used by S4/S5) |
| SEO (JSON-LD, sitemap, OG) | [seo.md](society-profile-v2/seo.md) | S7/S8/S10, finalized S11 |
| Society-portal & admin editors | [portal-editors.md](society-profile-v2/portal-editors.md) | S9 |

---

## 3. How to use with the playbook

Per `docs/society-profile-v2-playbook.md`, each session attaches **[`foundations.md`](society-profile-v2/foundations.md) + only the module/concern file(s) for that session** (UI sessions also attach `@docs/design/Sectoria_Design_System.md`). The data/API sessions (S1, S2) reference all module files; the rest are narrow. Run sessions in order **S0 -> S11**, ticking each Test Gate and running `pnpm turbo run test lint typecheck` between them.

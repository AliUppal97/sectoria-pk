# Sectoria.pk — Concierge Transition Playbook

Companion to [`docs/architecture/ADR-007-concierge-pivot.md`](architecture/ADR-007-concierge-pivot.md). Use this playbook when executing the pivot from self-serve marketplace to **managed concierge** model.

**Per-session ritual:** new chat → set model tier → attach `@docs/concierge-transition-playbook.md`, `@docs/architecture/ADR-007-concierge-pivot.md`, `@docs/Sectoria_File_Structure.md` (UI sessions also attach `@docs/design/Sectoria_Design_System.md`) → run prompt → test gate → `pnpm turbo run test lint typecheck` → commit.

## Business model (one page)

- **Public:** compare verified societies; request best price via Sectoria — no dealer contact.
- **Ops CRM:** leads → quotes (margin = quoted − dealer net) → token payment.
- **Dealers:** net price sheets + fulfillment orders (no buyer PII).
- **Revenue:** quote spread + token fee + (Option B) installment servicing fee.

## Feature flags (`.env`)

```bash
FEATURE_LEGACY_SELF_SERVE_BOOKING=false
FEATURE_PUBLIC_DEALER_DIRECTORY=false
FEATURE_LEGACY_SOCIETY_BOOKING_QUEUE=false
```

---

## Session map

| Session | Topic | Tier |
|---------|-------|------|
| T0 | ADR-007 + this playbook | C |
| T1 | CRM types | A |
| T2 | DB schema + seed | A |
| T3 | CRM API routers | A |
| T4 | Feature flags + legacy hide | A |
| T5 | Ops portal auth | A |
| T6 | Homepage pivot | B |
| T7 | Quote forms | B |
| T8 | Hide dealers + society queue | B |
| T9 | Support + buyer quote dashboard | B |
| T10 | Ops lead pipeline | B |
| T11 | Quote builder + margin matrix | A/B |
| T12 | Dealer net sheets | B |
| T13 | Fulfillment orders | A |
| T14 | Token payment + webhook | A |
| T15 | Option A completion | B |
| T16 | Installments (Option B) | A |
| T17 | Remittance + revenue | A |
| T18 | E2E + CI | B |
| T19 | Docs + rules + security | B/C |

---

## T1 — packages/types

**Prompt:**
```
@docs/concierge-transition-playbook.md @docs/architecture/ADR-007-concierge-pivot.md

Add Zod schemas: lead.ts, quote.ts, dealer-net-sheet.ts, fulfillment-order.ts,
platform-fee.ts. Add SALES_ADVISOR to UserRole. Re-export from index.ts.
Money = integer PKR or decimal strings. Mark legacy-only tax/verification inputs @deprecated in comments.
```

**Test gate:** `pnpm --filter @sectoria/types typecheck` clean.

**Commit:** `feat(types): lead, quote, dealer-net-sheet, and fulfillment schemas`

---

## T2 — packages/database

**Prompt:**
```
Add Prisma models Lead, Quote, DealerNetSheet, FulfillmentOrder, QuotePayment.
Add SALES_ADVISOR to UserRole enum. Migrate + update seed with sample CRM data.
```

**Test gate:** migrate + seed + encryption tests pass.

**Commit:** `feat(database): CRM models, SALES_ADVISOR role, and seed data`

---

## T3 — packages/api-client

**Prompt:**
```
Add lead, quote, dealerNetSheet, fulfillment routers. Add calculateQuoteMargin helper
with unit test. Ops-only access to dealer net; public lead.create rate-limited.
```

**Test gate:** `pnpm --filter @sectoria/api-client test` green.

**Commit:** `feat(api-client): CRM routers with ops/dealer authorization`

---

## T4 — Feature flags

**Prompt:**
```
Add apps/web/lib/feature-flags.ts. Gate booking.create, listLeads, booking wizard routes.
Default flags false for concierge.
```

**Commit:** `feat: feature flags to deprecate self-serve booking and dealer leads`

---

## T5 — Ops portal

**Prompt:**
```
Add (ops)/ops-portal route group, middleware for SALES_ADVISOR + SUPER_ADMIN, ops-shell.
Update ROLE_HOME for SALES_ADVISOR.
```

**Commit:** `feat(web): ops portal route group and SALES_ADVISOR guards`

---

## T6–T9 — Public UX

**T6:** Homepage — remove NADRA/tax copy; concierge CTAs.
**T7:** QuoteRequestForm on compare + category pages.
**T8:** Hide /dealers; society booking queue when flag off.
**T9:** /support page; buyer dashboard shows leads/quotes.

---

## T10–T11 — Ops CRM UI

**T10:** /ops-portal/leads pipeline.
**T11:** /ops-portal/quotes/new + /ops-portal/pricing margin matrix.

---

## T12–T13 — Dealer supply

**T12:** /dealer-portal/pricing net sheets.
**T13:** /dealer-portal/fulfillment — no buyer PII.

---

## T14–T15 — Option A payments

**T14:** Accept quote → pay token → webhook → fulfillment trigger.
**T15:** Post-token buyer status; ops mark deal won.

---

## T16–T17 — Option B

**T16:** Installment schedule + pay on platform.
**T17:** Remittance queue + admin revenue (platform spread).

---

## T18 — E2E

Replace critical-path with: browse → compare → quote → accept → token → fulfillment.

---

## T19 — Docs + rules

Update access-rights-matrix.md; add `.cursor/rules/concierge-model.mdc`; security grep audit.

---

## Quality gate (every session)

```bash
pnpm turbo run test lint typecheck
```

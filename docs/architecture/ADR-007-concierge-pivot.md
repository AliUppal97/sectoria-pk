# ADR-007: Concierge marketplace pivot — managed quotes, dealer supply, platform-owned customer

- **Status:** Accepted
- **Date:** 2026-06-30
- **Related:** ADR-001, `concierge-transition-playbook.md`, `concierge-model.mdc`

## Context

The initial build targeted a **self-serve escrow marketplace**: buyers verify via NADRA,
calculate transfer tax live, and complete a 5-step booking wizard without human
intervention. In Pakistan's primary housing market, societies rarely sell plots
directly — **authorized dealers** hold inventory and customer relationships. An open
marketplace that exposes dealer contact or self-serve booking invites
**disintermediation**: buyers compare on Sectoria, then close off-platform.

## Decision

Pivot to a **managed concierge model**:

1. **Public layer** — verified society comparison (licenses, maps, payment plan types,
   price ranges). CTAs: "Get best price" / contact Sectoria advisors. No public
   dealer directory or direct dealer contact.
2. **Ops CRM** — leads, advisor quotes, dealer net price matrix (confidential margin
   data). Sectoria advisors own the customer relationship.
3. **Supply layer** — authorized dealers submit net price sheets and receive
   **fulfillment orders** (no buyer PII) after token payment.
4. **Payments** — phased: **Option A** (token on platform, installments direct) first;
   **Option B** (full installment servicing) second.
5. **Legacy self-serve** — booking wizard, NADRA/tax UI, public dealer pages, society
   booking queue **deprecated and hidden** via feature flags. Domain packages
   (`domain/tax`, `verification`) remain in repo but are not invoked from public flows.

### Feature flags (default for concierge launch)

```bash
FEATURE_LEGACY_SELF_SERVE_BOOKING=false
FEATURE_PUBLIC_DEALER_DIRECTORY=false
FEATURE_LEGACY_SOCIETY_BOOKING_QUEUE=false
```

Set any flag to `true` to re-enable the original self-serve path for regression.

### Revenue model

- **Quote spread** — customer quoted price minus dealer net (confidential)
- **Token / facilitation fee** — charged at first platform payment
- **Installment servicing fee** — Option B only, per payment or % of GMV

## Consequences

- **Positive:** Customer data and margin stay on-platform; dealers are supply partners,
  not competing storefronts.
- **Positive:** Faster launch — no NADRA/FBR API dependency for public conversion.
- **Positive:** Reuses escrow, ledger, and payment infrastructure for token/installments.
- **Negative:** Ops team becomes a bottleneck — mitigated by CRM tooling and templated
  quotes.
- **Negative:** Two product modes coexist behind flags until legacy is removed — tests
  must cover both paths during transition.

## New roles and entities

- `SALES_ADVISOR` — ops CRM access without full admin
- `Lead`, `Quote`, `DealerNetSheet`, `FulfillmentOrder`, `QuotePayment` — see
  `packages/types` and `schema.prisma`

# Concierge Transition — Remaining Sessions (Follow in Order)

**This is the only file you need to finish the concierge pivot.** Sessions T1–T13, T17, and T18 are already implemented in the codebase. Run **Step 1 → Step 5** below in order — one step per Cursor chat, do not skip ahead until that step’s test gate passes.

Reference (do not re-implement): [`architecture/ADR-007-concierge-pivot.md`](architecture/ADR-007-concierge-pivot.md) · [`.cursor/rules/concierge-model.mdc`](../.cursor/rules/concierge-model.mdc)

**Last audited:** 2026-07-11

---

## Before you start (once)

- [ ] On a clean branch off latest `main`; working tree committed
- [ ] `pnpm install` clean; `pnpm turbo run test lint typecheck` green at baseline
- [ ] `.env` has concierge flags **off** (default):
  ```bash
  FEATURE_LEGACY_SELF_SERVE_BOOKING=false
  FEATURE_PUBLIC_DEALER_DIRECTORY=false
  FEATURE_LEGACY_SOCIETY_BOOKING_QUEUE=false
  ```
- [ ] Postgres reachable for local tests / seed

---

## Every step — same ritual

### A. Implement (one Cursor chat)

1. **New chat** in Cursor (Agent mode)
2. **Set model tier** listed for that step (pick the current best model in that tier from your dropdown)
3. **`@`-attach** exactly the files listed under **Attach**
4. **Paste** the step’s **Prompt** block
5. When the agent finishes, run the **Test gate** — every box must pass

**Quality gate (after every step):**

```bash
pnpm turbo run test lint typecheck
```

### B. Review (optional but recommended)

6. Run **`session-ship-review`** (`@.cursor/skills/session-ship-review/SKILL.md`) — expert panel vs this step’s prompt + test gate. Fix blockers or sub-sessions before shipping.

### C. Ship (`ship-pr`)

7. Invoke **`ship-pr`** (`@.cursor/skills/ship-pr/SKILL.md`) — branch → scoped commit → push → PR → wait for CI → merge → sync `main`
8. **Tick** the step in the Progress tracker above, then start the next step in a **new chat**

> **One step = one PR.** Do not batch Step 1 and Step 2 into a single PR.

---

## Progress tracker

| Step | Title | Status |
|---:|---|---|
| 1 | Ops “mark deal won” UI | ✅ |
| 2 | Option B installment schedule | ✅ |
| 3 | CRM router integration tests | ✅ |
| 4 | Security audit + doc closure | ✅ |
| 5 | Encryption key rotation runbook (optional) | ⬜ |
| 6 | Quote payment PSP webhook (defer until PSP) | ⬜ skip for now |

---

# Step 1 of 5 — Ops “mark deal won” UI

- **Maps to:** Playbook T15 (Option A completion)
- **Model:** Tier B
- **Attach:**
  - `@docs/concierge-transition-remaining-sessions.md`
  - `@docs/architecture/ADR-007-concierge-pivot.md`
  - `@docs/Sectoria_File_Structure.md`
  - `@docs/design/Sectoria_Design_System.md`

**Prompt:**

```
@docs/concierge-transition-remaining-sessions.md @docs/architecture/ADR-007-concierge-pivot.md @docs/Sectoria_File_Structure.md @docs/design/Sectoria_Design_System.md

Implement Step 1 (Ops mark deal won UI). Context: quote.markDealWon already exists in
packages/api-client/src/routers/quote.router.ts but has no ops UI.

1. On apps/web/app/(ops)/ops-portal/leads/[leadId]/page.tsx (or a small client
   component colocated under apps/web/components/ops/): add a "Mark deal won" action
   visible when the lead has an ACCEPTED quote with a confirmed TOKEN payment.
2. Confirm dialog (not a toast): explain that this closes the deal and sets how
   future installments are collected:
   - installmentsDirect=true → buyer pays society/dealer off-platform (Option A)
   - installmentsDirect=false → buyer pays on Sectoria (Option B)
3. Call quote.markDealWon with leadId + installmentsDirect choice.
4. Refresh lead status to WON after success; design tokens only; five states.

Do not re-implement types, schema, or routers that already exist. Smallest correct diff.
Update docs/architecture/access-rights-matrix.md if you add a new visible action.
```

**Test gate:**

- [ ] Log in as seeded sales advisor → open a lead with token-paid accepted quote → mark deal won from UI
- [ ] `installmentsDirect` choice persists on the quote (verify in Prisma Studio or API)
- [ ] Lead status shows WON after action
- [ ] Confirm dialog used (not toast) for this ops action
- [ ] `pnpm turbo run test lint typecheck` clean

**Commit:** `feat(ops): mark deal won and installment routing from lead detail`

---

# Step 2 of 5 — Option B installment schedule

- **Maps to:** Playbook T16 (Installments on platform)
- **Model:** Tier A
- **Attach:**
  - `@docs/concierge-transition-remaining-sessions.md`
  - `@docs/architecture/ADR-007-concierge-pivot.md`
  - `@docs/Sectoria_File_Structure.md`
  - `@docs/design/Sectoria_Design_System.md`

**Prompt:**

```
@docs/concierge-transition-remaining-sessions.md @docs/architecture/ADR-007-concierge-pivot.md @docs/Sectoria_File_Structure.md @docs/design/Sectoria_Design_System.md

Implement Step 2 (Option B installment schedule). Context: quote.payInstallment exists
but apps/web/components/buyer/quote-actions.tsx uses a manual amount field and
hardcodes installmentIndex=0.

1. Extend quote.listForBuyer (or add a read helper) to return installment schedule rows
   for quotes where installmentsDirect=false: derive from the quote's category
   PaymentPlan (installmentCount, installmentInterval, quotedPricePkr, tokenAmountPkr)
   or store a snapshot on Quote at send-time — pick the smallest additive approach.
2. Show schedule on the buyer quote card: index, due label, amount, paid/pending status.
3. "Pay next installment" pays the next unpaid index via quote.payInstallment — no
   free-text amount unless the plan requires it.
4. Reject duplicate installmentIndex payments (idempotent or CONFLICT).
5. Optional if straightforward: apply platformFeeSnapshotSchema.servicingFeePct on
   installment ledger payload; surface in admin revenue if already wired.

Never expose dealerNetPkr/spreadPkr to buyers. Money actions use confirm dialogs.
Add tests for schedule derivation and payInstallment index guard.
```

**Test gate:**

- [ ] Buyer with `installmentsDirect=false` sees schedule rows on `/dashboard/quotes`
- [ ] Pay installment advances the correct index (not always 0)
- [ ] Duplicate index payment rejected or idempotent (test)
- [ ] Buyer payloads still omit dealer net / spread (grep + test)
- [ ] `pnpm turbo run test lint typecheck` clean

**Commit:** `feat(concierge): structured installment schedule and platform payments (Option B)`

---

# Step 3 of 5 — CRM router integration tests

- **Maps to:** Playbook T3 test-gate gap
- **Model:** Tier A
- **Attach:**
  - `@docs/concierge-transition-remaining-sessions.md`
  - `@docs/architecture/ADR-007-concierge-pivot.md`
  - `@docs/Sectoria_File_Structure.md`

**Prompt:**

```
@docs/concierge-transition-remaining-sessions.md @docs/architecture/ADR-007-concierge-pivot.md @docs/Sectoria_File_Structure.md

Implement Step 3 (CRM router tests). Routers already exist:
packages/api-client/src/routers/{lead,quote,dealer-net-sheet,fulfillment}.router.ts

Add packages/api-client/src/__tests__/concierge.router.test.ts following existing
__tests__ patterns (in-memory DB helpers if present). Cover at minimum:

1. lead.create — public, rate-limited; valid input creates lead + ledger event
2. quote.createDraft / send — opsProcedure only; buyer DTO never includes dealerNetPkr or spreadPkr
3. quote.listForBuyer — ownership: buyer sees only own quotes
4. fulfillment.listForDealer — no buyer name, phone, CNIC, or email in payload
5. dealerNetSheet.listMatrix — ops only; rejects buyer/dealer wrong role

Do not change router behavior unless a test exposes a real bug. Fix bugs with smallest diff.
```

**Test gate:**

- [ ] `pnpm --filter @sectoria/api-client test` green including new concierge tests
- [ ] `grep` buyer-facing quote DTO paths — no `dealerNetPkr` / `spreadPkr` in wire output
- [ ] `pnpm turbo run test lint typecheck` clean

**Commit:** `test(api): concierge lead, quote, and fulfillment router guards`

---

# Step 4 of 5 — Security audit + doc closure

- **Maps to:** Playbook T19
- **Model:** Tier B (use Tier A if the audit finds auth/money issues)
- **Attach:**
  - `@docs/concierge-transition-remaining-sessions.md`
  - `@docs/architecture/ADR-007-concierge-pivot.md`

**Prompt:**

```
@docs/concierge-transition-remaining-sessions.md @docs/architecture/ADR-007-concierge-pivot.md

Implement Step 4 (security audit + doc closure) per security.mdc and concierge-model.mdc:

1. Grep the codebase for plaintext CNIC/NTN in console.log, error messages, and
   buyer/dealer-facing responses — fix any leaks (mask or entity ID).
2. Grep buyer/public API payloads for dealerNetPkr, spreadPkr, commission — must not appear.
3. Confirm fulfillment dealer views omit buyer PII (spot-check DTO mappers + dealer pages).
4. Update docs/architecture/society-profile-v2-spec.md Status from Proposed → Implemented
   ONLY if the profile v2 codebase matches (do not change product code in this step).
5. In docs/concierge-transition-remaining-sessions.md Progress tracker: mark Steps 1–3
   as done if their test gates passed (edit checkboxes only).
6. Write a short "Security audit YYYY-MM-DD" bullet list at the bottom of this file
   documenting what you checked and any fixes.

Do not add new features — audit and doc fixes only.
```

**Test gate:**

- [x] No raw CNIC/NTN patterns in logs/errors (document grep commands run)
- [x] No dealer net/spread in buyer-facing tRPC responses
- [x] `pnpm turbo run test lint typecheck` clean
- [x] Audit notes appended to this file

**Commit:** `docs(security): concierge audit and close remaining session tracker`

---

# Step 5 of 5 — Encryption key rotation runbook (optional)

- **Maps to:** ADR-005 operational follow-up
- **Model:** Tier C (documentation only)
- **Attach:**
  - `@docs/concierge-transition-remaining-sessions.md`
  - `@docs/architecture/ADR-005-encryption-key-rotation.md`
  - `@packages/database/src/encryption.ts`

**Prompt:**

```
@docs/concierge-transition-remaining-sessions.md @docs/architecture/ADR-005-encryption-key-rotation.md @packages/database/src/encryption.ts

Implement Step 5 (optional runbook). Create docs/runbooks/rotating-encryption-keys.md
with operator steps for lazy re-encrypt per ADR-005: dual-key period, deploy order,
verify decrypt with v1/v2 tags, on-login or batch re-encrypt, rollback. Link from ADR-005.
No application code changes unless a doc references wrong env var names — fix docs only.
```

**Test gate:**

- [x] `docs/runbooks/rotating-encryption-keys.md` exists and ADR-005 links to it
- [x] Steps match the versioned ciphertext format in encryption.ts

**Commit:** `docs(runbook): encryption key rotation procedure`

---

# Step 6 — Quote payment PSP webhook (skip until you have a PSP)

**Do not run this step** until you integrate JazzCash, PayFast, or similar. Demo/E2E uses in-app `quote.payToken` today.

- **Maps to:** Playbook T14
- **Model:** Tier A
- **Attach:**
  - `@docs/concierge-transition-remaining-sessions.md`
  - `@docs/architecture/ADR-007-concierge-pivot.md`
  - `@apps/web/app/api/webhooks/escrow/route.ts` (pattern reference)

**Prompt:**

```
@docs/concierge-transition-remaining-sessions.md @docs/architecture/ADR-007-concierge-pivot.md @apps/web/app/api/webhooks/escrow/route.ts

Implement Step 6 (quote payment webhook). Add apps/web/app/api/webhooks/quote-payment/route.ts:

1. Verify PSP signature BEFORE parsing/processing body (mirror escrow webhook).
2. Idempotent on externalEventId — duplicate webhook must not double-create QuotePayment
   or FulfillmentOrder.
3. On token confirmed: create QuotePayment + FulfillmentOrder + ledger in one transaction
   (same logic as quote.payToken today — extract shared helper if needed).
4. Add env vars to .env.example; document in packages/api-client README or webhook runbook.

Add tests for signature failure, idempotent retry, and happy path.
```

**Test gate:**

- [ ] Webhook rejects unsigned/invalid requests
- [ ] Duplicate externalEventId is idempotent
- [ ] Token confirmation creates fulfillment order once
- [ ] `pnpm turbo run test lint typecheck` clean

**Commit:** `feat(payments): quote token webhook with idempotent fulfillment trigger`

---

## Already done (do not re-run)

| Playbook | Topic | Key evidence |
|---|---|---|
| T0–T2 | Types + DB + seed | `packages/types/src/lead.ts`, Prisma CRM models |
| T3 | Routers (code) | `lead/quote/dealerNetSheet/fulfillment` routers — tests land in **Step 3** |
| T4–T13 | Flags, ops portal, public UX, dealer supply | `(ops)/ops-portal/*`, `quote-request-form.tsx`, dealer pricing/fulfillment |
| T14 | Token pay (in-app) | `quote.payToken` — webhook is **Step 6** when PSP exists |
| T17 | Remittance + revenue | `admin/remittance`, `admin/revenue` |
| T18 | E2E | `e2e/critical-path.spec.ts` |

---

## Security audit log

### Security audit 2026-07-11

**Grep commands run:**

```bash
# CNIC/NTN in console / logger calls
rg -i 'console\.(log|error|warn|info|debug)\([^)]*(cnic|ntn)' --glob '*.{ts,tsx,js,jsx}'
rg -i 'logger\.(info|error|warn).*?(cnic|ntn)' --glob '*.{ts,tsx}' apps/web

# CNIC/NTN interpolated into thrown error messages
rg -i '(message|throw|Error|TRPCError)\([^)]*(cnic|ntn)' --glob '*.{ts,tsx}'
rg 'message:.*cnic|message:.*ntn' --glob '*.{ts,tsx}' packages/api-client/src

# Buyer/public margin leakage
rg 'dealerNetPkr|spreadPkr|commission' --glob '*.{ts,tsx}'
rg 'dealerNetPkr|spreadPkr' --glob 'apps/web/**/*.{ts,tsx}'
rg 'dealerNetPkr|spreadPkr|commission' --glob '**/buyer/**/*.{ts,tsx}'

# Dealer fulfillment PII
rg -i 'cnic|ntn|buyerName|buyerPhone|buyerEmail|lead\.name|lead\.phone' \
  --glob '**/dealer-portal/**/*.{ts,tsx}' --glob '**/fulfillment*'

# Decrypt usage (plaintext rehydration)
rg 'decrypt\(' --glob '*.{ts,tsx}'
```

**Findings (no product-code fixes required):**

- **CNIC/NTN logs/errors:** No `console.*` / logger calls include CNIC or NTN. Error messages reference field names only (e.g. format guidance), never raw values. `verification.router` encrypts CNIC/NTN at rest and omits them from ledger payloads and tRPC responses. `decrypt()` is used only in `packages/database` encryption unit tests — no runtime decrypt path in API/UI.
- **Buyer margin fields:** `toBuyerQuoteDto` / `toQuoteDto` omit `dealerNetPkr` and `spreadPkr`; `listForBuyer` runs `assertNoForbiddenBuyerFields`. Buyer UI under `apps/web` has no `dealerNetPkr`/`spreadPkr`/`commission` references. Ops/admin remittance/revenue surfaces correctly retain margin fields.
- **Dealer fulfillment:** `fulfillment.listForDealer` returns order ref, status, society/category labels, plot ref only — no buyer name/phone/CNIC/email. Dealer fulfillment page copy states buyer contact is withheld. Ops `listAll` may include `leadName` + `spreadPkr` (ops-only).
- **Society profile v2:** Codebase matches feature-complete definition (M0–M8 + S9–S11 landed on `main`). Spec status updated Proposed → Implemented.
- **Steps 1–3:** Confirmed merged (`feat(ops): mark deal won…`, `feat(concierge): structured installment schedule…`, `test(api): concierge … router guards`). Progress tracker marked ✅.

# Concierge Transition — Implementation Status (Audit Reference)

> **Execute remaining work here instead:** [`concierge-transition-remaining-sessions.md`](concierge-transition-remaining-sessions.md) — follow Step 1 → Step 5 in order. This file is an audit snapshot only.

**Last audited:** 2026-07-06

---

## Session status

| Session | Topic | Status |
|---|---|---|
| T0–T2 | Docs, types, DB | ✅ Done |
| T3 | CRM routers | ⚠️ Code done — tests in **Remaining Step 3** |
| T4–T13 | Flags, portals, UX, dealer supply | ✅ Done |
| T14 | Token payment | ⚠️ In-app done — PSP webhook **Remaining Step 6** (defer) |
| T15 | Option A completion | ⚠️ Buyer UI done — ops mark won **Remaining Step 1** |
| T16 | Option B installments | ⚠️ API done — schedule UI **Remaining Step 2** |
| T17–T18 | Remittance, E2E | ✅ Done |
| T19 | Docs + security | ⚠️ Rules done — audit **Remaining Step 4** |

---

## Remaining steps (execution order)

| Step | Title | File |
|---:|---|---|
| 1 | Ops “mark deal won” UI | [`concierge-transition-remaining-sessions.md`](concierge-transition-remaining-sessions.md#step-1-of-5--ops-mark-deal-won-ui) |
| 2 | Option B installment schedule | [`concierge-transition-remaining-sessions.md`](concierge-transition-remaining-sessions.md#step-2-of-5--option-b-installment-schedule) |
| 3 | CRM router integration tests | [`concierge-transition-remaining-sessions.md`](concierge-transition-remaining-sessions.md#step-3-of-5--crm-router-integration-tests) |
| 4 | Security audit + doc closure | [`concierge-transition-remaining-sessions.md`](concierge-transition-remaining-sessions.md#step-4-of-5--security-audit--doc-closure) |
| 5 | Encryption key rotation runbook (optional) | [`concierge-transition-remaining-sessions.md`](concierge-transition-remaining-sessions.md#step-5-of-5--encryption-key-rotation-runbook-optional) |
| 6 | Quote payment PSP webhook (defer) | [`concierge-transition-remaining-sessions.md`](concierge-transition-remaining-sessions.md#step-6--quote-payment-psp-webhook-skip-until-you-have-a-psp) |

---
name: session-ship-review
description: >-
  Pre-ship expert panel review after a playbook session: compare the diff against
  the session prompt and test gate, defer gaps to upcoming sessions when their
  prompts own the work, write playbook sub-sessions for in-scope fixes, and report
  ship verdict before ship-pr. Use when the user finished a session implementation,
  before shipping or opening a PR, or says review session, pre-ship review, session gate.
disable-model-invocation: true
---

# Session Ship Review — expert panel before PR

Run this **after** a playbook session is implemented and **before** `ship-pr`.
Compares what was built vs the session prompt + test gate, **defers work that
upcoming sessions explicitly own**, and for **in-scope gaps** writes a playbook
**sub-session** (S2a, S0b, …) with a paste-ready prompt **before** implementation.

## When to use

- User finished a build session (S0–S11, or `session-playbook.md` sessions)
- User asks: *review before ship*, *session gate*, *ready to ship?*, *pre-PR review*

## When NOT to use

- Work is mid-implementation → finish first
- User only wants Bugbot or security-only review → use `review-bugbot` or `review-security`
- User already approved ship and only wants git/PR mechanics → use `ship-pr` directly

## Hard rules

- **Deferral first** — never 🔴 BLOCKER on work a **later session Prompt/Test Gate** owns
- **Sub-session for in-scope gaps** — if the gap belongs to the current session (or its cross-cuts) and no later session fixes it, write a sub-session to the playbook; do not only nag in chat
- **Edit playbook before code** — append/update the sub-session block in the playbook file, then show the user the prompt from that block
- **Read-only on application code** during review — implement only if user asks after report
- **Never** weaken tests or skip quality gates for a green verdict
- **Never** flag missing UI in an API-only session (or vice versa) unless the current session required it

## Phase 0 — Identify the session

Determine **which session** this work belongs to:

1. User states it explicitly (`S2`, `Session 5`, …)
2. Branch name or commit message
3. Chat history — pasted session prompt
4. Diff footprint vs playbook topics

If ambiguous, ask once: *Which playbook session (ID + playbook file)?*

| Feature track | Playbook |
|---|---|
| Society Profile V2 | `docs/society-profile-v2-playbook.md` |
| Core platform build | `docs/session-playbook.md` |

Record: **session ID**, **playbook path**, **model tier**, **attach list**, **rules expected**.

## Phase 1 — Gather evidence (parallel)

```bash
git fetch origin
git status
git log origin/main..HEAD --oneline
git diff origin/main...HEAD
git diff   # unstaged
pnpm turbo run test lint typecheck
```

Read for **this session**: Prompt, Test Gate, rules expected.

Read **all remaining sessions** (every session after current ID through end of track):

- Full **Prompt** and **Test Gate** for each
- Build an **ownership inventory**: topic → owning session ID(s)
- Note explicit deferrals in current prompt (*"lands in S3"*, *"stub"*, *"no UI"*)

Also read when relevant: `access-rights-matrix.md`, spec modules, canonical patterns,
playbook **Fast triage** table, `foundations.md` cross-cuts.

Deferral algorithm: [playbook-sub-session.md](playbook-sub-session.md).

## Phase 2 — Scope reconciliation

Classify **every finding** into exactly one bucket:

### ⏭️ DEFER — upcoming session owns it

Later session **Prompt or Test Gate** explicitly includes this work. Mark ⏭️ only —
**never** 🔴 or 🟡 for ship-blocking. Cite owning session + playbook quote fragment.

Examples (Society Profile V2): presigned uploads → S3; profile UI → S4–S8;
portal editors → S9; blog → S10; sitemap JSON-LD E2E → S11.

### 📋 SUB-SESSION — current session scope, no future owner

Gap is required by:

- Current session **Prompt** or **Test Gate**, OR
- Cross-cut the session introduced (e.g. new `publicProcedure` must follow
  `foundations.md` §1.1 `publishStatus` rule), OR
- Playbook **Fast triage** STOP rule with no later session fix

And **no** remaining session Prompt/Test Gate will address it.

→ Go to **Phase 4** (write sub-session). Parent session gets 🛑 **DO NOT SHIP**
until sub-session completes **or** user explicitly accepts risk after reading sub-session.

### ✅ OK — ship

Implemented, or acceptable omission with no spec violation.

### Out of scope / nice-to-have

🟢 only when low severity and not spec-required.

## Phase 3 — Expert panel review

Review through lenses in [expert-lenses.md](expert-lenses.md). Apply Phase 2
classification to each finding **before** tagging severity.

| Lens | Lead question |
|---|---|
| Correctness & completeness | Prompt + test gate satisfied? |
| Security & access control | Guards, PII, concierge redaction |
| Scalability & performance | N+1, pagination, indexes |
| Architecture & maintainability | Types, routers, transactions |
| Business & product | Concierge, publish gates |
| UI/UX & design system | If UI session only |
| Testing & quality | Turbo green; gate tests |
| Docs & compliance | access-rights-matrix, ADRs |

Skip lenses that don't apply. Optional: `review-security` / `review-bugbot` for Tier A risk only.

## Phase 4 — Sub-session authoring (when Phase 2 → 📋)

**Mandatory** when any 📋 SUB-SESSION finding exists.

1. Choose ID: `{parentId}a`, `{parentId}b`, … (see [playbook-sub-session.md](playbook-sub-session.md))
2. **Edit the playbook file** — insert block immediately after parent session:
   - Model, Mode, Parent, Attach, Rules expected
   - **Prompt** (paste-ready, `@` attachments, numbered deliverables, explicit don'ts)
   - **Test Gate** (binary checks + turbo + commit message)
3. **Update** Session → tier map row for the sub-session
4. If first sub-session for this parent, optional note on parent Test Gate pointing to `{parentId}a`

Prompt quality must match `docs/society-profile-v2-playbook.md` — see template in
[playbook-sub-session.md](playbook-sub-session.md).

**Do not implement the fix in application code** unless user asks — playbook first.

## Phase 5 — Verdict & report

| Tag | Meaning |
|---|---|
| 🔴 **BLOCKER** | In-scope gap without sub-session yet (should not happen if Phase 4 ran) |
| 📋 **SUB-SESSION** | Documented in playbook as `{parentId}x` — run before next major session |
| ⏭️ **DEFER** | Upcoming session owns it — **not** a ship blocker |
| 🟢 **NICE TO HAVE** | Optional polish |

### Ship decision

| Verdict | Condition |
|---|---|
| ✅ **SHIP** | Test gate satisfied; turbo green; no 📋 sub-sessions pending |
| ⚠️ **SHIP WITH NOTES** | No 📋 items; only ⏭️ DEFER or 🟢 |
| 🛑 **DO NOT SHIP** | Test gate fail; turbo fail; or 📋 sub-session(s) written and not yet run |

Print:

```markdown
# Session Ship Review — <Session ID>

**Playbook:** <path>
**Branch / commits:** <summary>
**Scope:** <one line>

## Ship verdict: <✅ | ⚠️ | 🛑>

## Upcoming-session deferrals (not blockers)
| Finding | Owner session | Evidence from playbook |
|---|---|---|
| … | S3 | "Private-doc URL requires auth/ownership" (S3 Test Gate) |

## Sub-sessions added to playbook
| ID | Title | Playbook location | Run before |
|---|---|---|---|
| S2a | … | `docs/…playbook.md` after S2 | S3 |

### Paste-ready prompt — Session S2a
\```
<exact Prompt block from playbook>
\```

## Test gate
| Check | Status | Notes |
|---|---|---|

## Expert panel summary
| Lens | Status | Top note |
|---|---|---|

## Findings
| Tag | Lens | Location | Finding | Action |
|---|---|---|---|---|

## Prompt compliance
**Implemented:** …
**Deferred (upcoming sessions):** …
**Sub-session required:** …

## Recommended next steps
1. If 📋 → run sub-session prompt in new chat (Tier from playbook); then re-run `session-ship-review`
2. If ✅ or ⚠️ → `ship-pr`
3. Then advance to next major session (e.g. S3)
```

Sort findings: 📋 → 🔴 → 🟡 → ⏭️ → 🟢.

## Phase 6 — After the report

- **📋 sub-sessions** → user runs sub-session before `ship-pr` (unless they accept risk explicitly)
- **✅ / ⚠️** → `ship-pr` (or `split-to-prs` if needed)
- Do not commit application code unless user asks

## Quick checklist

```
Session ship review:
- [ ] Session ID + playbook identified
- [ ] git diff + turbo green
- [ ] ALL remaining sessions scanned for ownership
- [ ] Every finding classified DEFER | SUB-SESSION | OK
- [ ] Sub-sessions written to playbook (if any)
- [ ] Report includes deferral table + paste-ready sub-session prompts
- [ ] User directed to sub-session, ship-pr, or next major session
```

## Related

- [playbook-sub-session.md](playbook-sub-session.md) — template + deferral algorithm
- [expert-lenses.md](expert-lenses.md) — Sectoria checks + deferral map
- `ship-pr`, `split-to-prs`, `review-bugbot`, `review-security`

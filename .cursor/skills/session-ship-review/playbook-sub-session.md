# Playbook sub-session template & deferral rules

Use when `session-ship-review` finds gaps that belong to the **current session's
scope** but were missed in implementation. Sub-sessions are **not** new feature
work — they close ship-review gaps before advancing.

---

## When to create a sub-session vs defer vs ship

| Classification | Condition | Ship review action |
|---|---|---|
| **⏭️ DEFER** | A **later playbook session's Prompt or Test Gate** explicitly owns the work; OR current session prompt says stub/defer; OR different layer (UI vs API) excluded this session | Do **not** blocker. Cite owning session. |
| **📋 SUB-SESSION** | Gap is **in current session scope** (prompt, test gate, foundations cross-cut, or fast-triage STOP rule) and **no later session** will fix it | Write sub-session to playbook; **do not ship** parent until sub-session gate passes OR user explicitly skips after reading sub-session |
| **✅ SHIP OK** | Implemented or intentionally out of scope with no regression risk | No action |

### Deferral decision algorithm

1. Read **all remaining sessions** in the playbook (parent ID through end of track).
2. For each finding, search their **Prompt** and **Test Gate** for keywords:
   ownership verbs (implement, wire, add, guard, filter, test), file paths, procedure names.
3. If a later session **explicitly** owns it → **DEFER** (never 🔴 BLOCKER).
4. If only **related** (same domain, e.g. "security" in S3 but different concern) → not defer; evaluate sub-session.
5. Cross-cutting spec (`foundations.md`, M0 rules) applies to the session that **introduced** the surface:
   - S2 added `listForSociety` public reads → S2 owns `publishStatus` filter (foundations §1.1), not S11 (sitemap only).
6. Playbook **Fast triage** STOP rows → current-or-sub-session fix unless a later prompt explicitly takes it.

### What never blocks the current ship

- Real storage signing, presigned PUT, CSP env (→ S3)
- Profile UI components (→ S4–S8)
- Portal editors (→ S9)
- Blog pages (→ S10)
- Sitemap/JSON-LD/E2E (→ S11)
- Stubbed URL resolver when S2 prompt says "lands in S3"

---

## Sub-session ID naming

- Parent **S2** → first gap fix **S2a**, second **S2b**, etc.
- Parent **S0** → **S0a**, **S0b**
- Insert sub-session block **immediately after** the parent session in the playbook.
- Add row to **Session → tier map** (inherit parent tier unless gap is UI-only → B).
- Sub-sessions run **after parent ships** (or before, if review caught pre-merge) and **before** the next major session (e.g. S2a before S3).

---

## Sub-session playbook block (copy this shape)

```markdown
## Session S{N}a — <short title> (ship-review gap)

- **Model:** Tier <A|B|C> (usually same as parent)
- **Mode:** Agent
- **Parent:** S{N} — run after S{N} Test Gate passes; complete before S{N+1}
- **Attach:** `@<exact files>` (minimal — same discipline as parent)
- **Rules expected to load:** `<rule names from parent or gap-specific>`

**Prompt:**
\```
@<attach files>

<Imperative opening — one line goal.>

1. <Numbered deliverables — files, functions, behaviors.>
2. ...

<Cross-cutting constraints from foundations/rules — concierge, no PII, etc.>

Add tests: <specific assertions>. Do not expand scope into <deferred session topics>.
\```

**Test Gate:**
- [ ] <Concrete, verifiable check — same specificity as main sessions>
- [ ] `pnpm turbo run test lint typecheck` clean.
- [ ] Commit + push: `<conventional commit subject>`
```

### Prompt quality bar (match `society-profile-v2-playbook.md`)

- **Attach line** lists exact `@` paths — not "the spec"
- **Numbered deliverables** with file paths and procedure names
- **Explicit don'ts** pointing at deferred sessions ("storage signing stays in S3")
- **Test gate** items are binary and testable
- **Commit message** in Conventional Commits form with scope

---

## Playbook edit rules

1. **Insert** sub-session after parent session block (before next major session).
2. **Update** Session → tier map table with new row.
3. **Do not** renumber S3–S11.
4. If sub-session already exists for the same gap, **update** it instead of duplicating.
5. Optionally add one line to parent session Test Gate: `- [ ] S{N}a complete (if spawned by ship-review)`.

Report to user: path edited, sub-session ID, and **paste-ready prompt** from the block.

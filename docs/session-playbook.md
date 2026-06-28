# Sectoria.pk — Session Playbook: Models, Settings & Test Gates

Companion to `@docs/Sectoria_Build_Process_And_Cursor_Settings.md` (environment setup, Cursor settings, session overview). **Use this playbook** (`@docs/session-playbook.md`) when running each build session — it has the model tier, prompt, and test gate for that session.

For **every** build session this file gives you, in order:

1. **Model** — which model tier to select before typing the prompt (Part 3.4 of the build doc).
2. **Mode & required settings** — what must be ON/connected before you run it.
3. **Rules that should auto-load** — confirm these `.mdc` files activate (sanity check that context is right).
4. **The prompt** — a tightened, well-defined version of the build-doc prompt.
5. **Test gate** — concrete checks that must pass **before** you start the next session.

> Golden rule: **do not advance to the next session until every box in its Test Gate is ticked.** A broken foundation package multiplies into every session above it.

---

## Design documentation (Sessions 4, 6–10)

Sectoria UI work is governed by three artifacts. **Lean rules auto-load** when you edit UI files; **the full spec is `@`-attached** when you need exact token values, component anatomy, or layout patterns.

| Artifact | Location | Role |
|---|---|---|
| **Full spec** | `@docs/design/Sectoria_Design_System.md` | Source of truth for colors, typography, bento grid, component specs, motion, trust patterns |
| **Design system rules** | `.cursor/rules/ui-design-system-sectoria.mdc` | Auto-attaches on `packages/ui/**` and `apps/web/app/**` — token discipline, PKR/CNIC formatting, bento rules |
| **UX excellence rules** | `.cursor/rules/ui-ux-excellence-sectoria.mdc` | Auto-attaches on `packages/ui/**` and `apps/web/app/**` — five states, trust UX, responsive, accessibility |

The generic `ui-design-system.mdc` and `ui-ux-excellence.mdc` are superseded by the `-sectoria` versions. When both appear in Settings → Rules, follow the Sectoria-specific files.

**Attach the full spec** (`@docs/design/Sectoria_Design_System.md`) in Sessions **4** and **6–10** prompts. **Do not attach it** in domain, database, API, security, or E2E sessions — it adds ~650 lines of context with no benefit.

---

## Model Tiers (map once, reuse everywhere)

Cursor's model list changes over time, so this playbook uses **tiers**, not hardcoded names. Pick the current best-fit in each tier from your model dropdown.

| Tier | Use for | Pick (examples — choose the current top of each family) |
|---|---|---|
| **A — Strongest** | Correctness-critical: domain logic (tax/escrow/balloting/allocation/trust/ledger), DB schema + encryption, tRPC guards/transactions, security audit | Opus-class / GPT-5-class — the most capable reasoning model shown |
| **B — Fast/Mid** | Pattern-following UI, CRUD pages, Storybook, docs, E2E scaffolding once a pattern exists | Sonnet-class / mid-tier — faster, cheaper, judgment-light work |
| **C — Either** | Mechanical scaffolding & config where the spec is exact | Either A or B; default to B to save budget |

**How to set it:** start a **new chat** → click the model name at the bottom-left of the input box → choose the tier's model **before** typing the prompt.

### Quick session → tier map

| Session | Topic | Tier | Mode |
|---|---|---|---|
| 0 | Monorepo scaffolding | C | Agent |
| 1 | `packages/types` (Zod) | C (lean to A if schemas are subtle) | Agent |
| 2a | `domain/tax` | **A** | Agent |
| 2b | `domain/escrow` | **A** | Agent |
| 2c | `domain/balloting` | **A** | Agent |
| 2d | `domain/allocation` | **A** | Agent |
| 2e | `domain/trust-score` | **A** | Agent |
| 2f | `domain/ledger` | **A** (B acceptable — simplest) | Agent |
| 3a | `packages/database` | **A** | Agent |
| 3b | `packages/verification` | **A** | Agent |
| 4 | `packages/ui` | B | Agent |
| 5 | `packages/api-client` (tRPC) | **A** | Agent |
| 6 | Public marketplace | B | Agent |
| 7 | Buyer dashboard + booking wizard | B (switch to **A** for the tax/escrow step logic) | Agent |
| 8 | Society portal | B | Agent |
| 9 | Dealer portal | B | Agent |
| 10 | Admin portal | B (mind the LedgerEvent writes) | Agent |
| 11 | Security hardening | **A** | Agent |
| 12 | Documentation pass | B | Agent |
| 13 | E2E Playwright suite | B | Agent |

> Note vs. build doc 3.4: Session 5 (`api-client`) and the wizard's tax/escrow logic in Session 7 are **upgraded to Tier A** here, because they wire money movement + auth guards + DB transactions together — the exact spot a cheaper model silently drops an ownership check or transaction boundary.

---

## One-Time Setup Gate (must be GREEN before Session 0)

Run this once. Maps to Part 1–3 of the build doc.

- [ ] `node -v` → `v22.x` (Part 1.1)
- [ ] `pnpm -v` → `9.x`+ (1.2)
- [ ] Postgres reachable (local `psql --version` 16.x, or Neon string saved) (1.3)
- [ ] Redis reachable (`redis-cli ping` → `PONG`, or Upstash creds saved) (1.4)
- [ ] `git --version` works + `user.name`/`user.email` configured (1.5)
- [ ] Folder created, `git init`, `git branch -M main`, remote `origin` added (2.1–2.2)
- [ ] Foundation unzipped into root; `find .cursor/rules -name "*.mdc" | wc -l` → **24** (22 foundation + `ui-design-system-sectoria` + `ui-ux-excellence-sectoria`) (2.3–2.4)
- [ ] `.env` created from `.env.example`; `AUTH_SECRET` + `ENCRYPTION_KEY` generated; DB/Redis filled; verification keys left blank (mocks) (2.5)
- [ ] Foundation committed + pushed: `chore: add Cursor rules, docs, and project config` (2.6)
- [ ] Recommended extensions installed (Install All popup) (Part 3 intro)
- [ ] **3.1** Settings → Rules: 24 Project Rules; `000-core` = Always; 16 Auto Attached (incl. `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`); 6 Agent Requested; `git-workflow` = Manual
- [ ] **3.2** Settings → Docs: Next.js, tRPC, Prisma, Auth.js, Tailwind all show **Indexed**
- [ ] **3.3** Settings → Indexing → Ignored files lists `node_modules/`, `.next/`, etc.
- [ ] **3.5** Settings → Features → Agent → Auto-run ON; allow/block lists configured
- [ ] **3.6** Settings → General → Privacy Mode ON
- [ ] **3.8** Codebase indexing finished (checkmark, not spinner)
- [ ] **3.7** Next.js DevTools MCP — *deferred until after Session 0* (needs `apps/web`)

**Per-session ritual (every time):** new chat → set model tier → `@`-attach `@docs/Sectoria_Cursor_Prompt.md` and `@docs/Sectoria_File_Structure.md` (Sessions 11 & 12 attach only the prompt; **Sessions 4 & 6–10 also attach** `@docs/design/Sectoria_Design_System.md`) → paste the session prompt from below → run Test Gate → commit → push.

---

# SESSIONS

---

## Session 0 — Monorepo scaffolding

- **Model:** Tier C (either)
- **Mode:** Agent
- **Required before running:** One-Time Setup Gate fully green. Auto-run ON so `pnpm install` runs unattended.
- **Rules expected to load:** `architecture` (Agent Requested), `dependency-management` (Agent Requested), `json-and-config-conventions` (on `*.json`).

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md

Start Session 0 from the build prompt. Create the complete monorepo
scaffold: turbo.json, root package.json with pnpm workspace config and a
version catalog populated with the EXACT versions from
docs/architecture/dependency-baseline.md (no "latest"), pnpm-workspace.yaml,
.github/workflows/ci.yml running `turbo run test lint typecheck` on every PR,
and packages/config with a shared ESLint flat config and tsconfig presets.
Do NOT create any application code or domain packages yet. List every file
you created at the end.
```

**Test Gate (all must pass before Session 1):**
- [ ] `pnpm install` completes with **zero** peer-dependency / version-conflict warnings
- [ ] `turbo.json`, root `package.json`, `pnpm-workspace.yaml`, `.github/workflows/ci.yml`, `packages/config/*` all exist
- [ ] Catalog versions in `pnpm-workspace.yaml` match `dependency-baseline.md` line-for-line
- [ ] No `apps/` or `packages/domain/*` created yet (scope respected)
- [ ] `pnpm turbo run typecheck` runs (may be a no-op) without config errors
- [ ] Commit + push: `chore(monorepo): scaffolding, config packages, and CI pipeline`
- [ ] **Now do build-doc Step 3.7**: `pnpm dev` won't work yet, but once `apps/web` exists (Session 6) connect the Next.js DevTools MCP

---

## Session 1 — packages/types

- **Model:** Tier C (lean Tier A if you want the schemas scrutinised harder)
- **Mode:** Agent
- **Required before running:** Session 0 gate green.
- **Rules expected to load:** `oop-and-domain-modeling` & `code-clarity-and-comments` (`**/*.ts`), `json-and-config-conventions`.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md

Start Session 1. Build packages/types exactly as listed in the file
structure document — every schema file (common.ts, society.ts,
inventory-category.ts, plot.ts, payment-plan.ts, booking.ts, escrow.ts,
user.ts, dealer-profile.ts, society-partner-authorization.ts, review.ts,
ledger-event.ts, tax.ts, verification.ts), all re-exported from index.ts.
Derive EVERY TypeScript type from its Zod schema via z.infer — no
hand-written parallel interfaces. Money fields are whole-rupee integers
(paisa are not used) or decimal strings, never floats. Dates are ISO 8601 strings.
```

**Test Gate:**
- [ ] `pnpm --filter @sectoria/types typecheck` → **no errors**
- [ ] All 14 schema files present and re-exported from `index.ts`
- [ ] No standalone `interface`/`type` duplicating a Zod shape (spot-check 2–3 files)
- [ ] No money field typed as `number` float; dates are ISO strings
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(types): complete Zod schema package`

---

## Session 2a — packages/domain/tax  ⚠️ highest-stakes

- **Model:** **Tier A (strongest)** — non-negotiable
- **Mode:** Agent
- **Required before running:** Session 1 gate green. Auto-run ON so the test loop runs itself.
- **Rules expected to load:** `domain-logic` (`packages/domain/**`), `oop-and-domain-modeling`, `code-clarity-and-comments`, `testing` (on test files).

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md

Start Session 2, tax package ONLY. Write the test file FIRST in
packages/domain/tax/src/__tests__/calculate-transfer-tax.test.ts covering:
- all 9 combinations of seller/buyer ATL status (filer / late-filer / non-filer)
- Section 7E exactly at threshold (PKR 25,000,000), one rupee above, one below
- sale price below FBR table value (tax MUST use FBR value, not agreed price)
- zero and negative price inputs (MUST throw a typed error)
Then implement packages/domain/tax/src/calculate-transfer-tax.ts until all
tests pass. Pure functions only — NO imports from Next.js, Prisma, or React.
Rate tables must be versioned (carry a fiscalYear field).
```

**Test Gate:**
- [ ] `pnpm --filter @sectoria/domain-tax test` → **all pass, zero skipped**
- [ ] Manually open the test file: all 9 ATL combos + 3 threshold cases (at/above/below) + below-FBR-value + zero/negative present
- [ ] Below-FBR-value case asserts tax uses **FBR value**, not agreed price
- [ ] Zero/negative throws a **typed** error (not a bare `throw new Error`)
- [ ] `grep`-check: no `next`, `@prisma`, or `react` import in the package
- [ ] Rate table has a `fiscalYear`/version field
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(domain-tax): FBR tax engine with full test coverage`

---

## Session 2b — packages/domain/escrow

- **Model:** **Tier A**
- **Mode:** Agent
- **Rules expected to load:** `domain-logic`, `oop-and-domain-modeling`, `testing`.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md

Build packages/domain/escrow. Implement the state machine (all legal
transitions between EscrowState values), transition-escrow-state.ts which
validates and applies a transition returning { nextState, event }, and a
typed InvalidEscrowTransitionError. Write tests FIRST covering: every legal
transition from every state, every illegal transition (must throw
InvalidEscrowTransitionError with a descriptive message), and idempotency
of reading current state. Pure functions only — no framework imports.
```

**Test Gate:**
- [ ] `pnpm --filter @sectoria/domain-escrow test` → all pass
- [ ] Test matrix covers **every** state's legal AND illegal transitions
- [ ] Illegal transitions throw `InvalidEscrowTransitionError` with a message
- [ ] `transition-escrow-state` returns `{ nextState, event }` shape
- [ ] No framework imports
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(domain-escrow): escrow state machine with tests`

---

## Session 2c — packages/domain/balloting

- **Model:** **Tier A**
- **Mode:** Agent
- **Rules expected to load:** `domain-logic`, `testing`.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md

Build packages/domain/balloting. run-ballot MUST be deterministic — same
entries + same seed always produce identical output. Tests must verify:
determinism (call twice with same input → identical output), the result
includes the seed and a SHA-256 hash of the input set, and an empty entries
array throws a descriptive typed error. Pure functions only — no framework
imports, no Math.random without the seed.
```

**Test Gate:**
- [ ] `pnpm --filter @sectoria/domain-balloting test` → all pass
- [ ] Determinism test calls twice and asserts deep-equality
- [ ] Result object contains `seed` + **SHA-256** hash of inputs
- [ ] Empty entries → typed descriptive error
- [ ] No unseeded randomness (`grep` for `Math.random`)
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(domain-balloting): deterministic seeded ballot algorithm`

---

## Session 2d — packages/domain/allocation

- **Model:** **Tier A**
- **Mode:** Agent
- **Rules expected to load:** `domain-logic`, `testing`.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md

Build packages/domain/allocation with FIFO and BALLOT strategy
implementations. Tests must cover: FIFO assigns the lowest available serial
number, BALLOT returns a pending result (no immediate assignment), and
allocating from a category with zero available units throws a typed error.
Pure functions only — no framework imports.
```

**Test Gate:**
- [ ] `pnpm --filter @sectoria/domain-allocation test` → all pass
- [ ] FIFO test asserts **lowest** available serial chosen
- [ ] BALLOT test asserts a **pending** (non-assigned) result
- [ ] Zero-availability → typed error
- [ ] No framework imports
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(domain-allocation): plot allocation strategies`

---

## Session 2e — packages/domain/trust-score

- **Model:** **Tier A**
- **Mode:** Agent
- **Rules expected to load:** `domain-logic`, `testing`.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md

Build packages/domain/trust-score. Verified-transaction count must carry at
least 50% of total score weight. Tests must verify: a dealer with zero
completed transactions cannot score above 50/100 regardless of other inputs,
the weight percentages sum to EXACTLY 100, and a null/undefined input throws
a typed error. Pure functions only — no framework imports.
```

**Test Gate:**
- [ ] `pnpm --filter @sectoria/domain-trust-score test` → all pass
- [ ] Zero-transaction dealer capped at ≤ 50/100 even with all other inputs maxed
- [ ] Weights sum to exactly 100 (asserted in a test)
- [ ] Null/undefined input → typed error
- [ ] No framework imports
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(domain-trust-score): trust scoring engine`

---

## Session 2f — packages/domain/ledger

- **Model:** **Tier A** (Tier B acceptable — simplest domain package)
- **Mode:** Agent
- **Rules expected to load:** `domain-logic`, `testing`.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md

Build packages/domain/ledger. create-ledger-event returns a typed
LedgerEvent object — it does NOT write to any database. Tests must verify:
every required field is present in the returned event, and createdAt is a
valid ISO string. Pure functions only — no framework imports, no DB client.
```

**Test Gate:**
- [ ] `pnpm --filter @sectoria/domain-ledger test` → all pass
- [ ] Returned event has every required field
- [ ] `createdAt` validated as ISO string in a test
- [ ] Function performs **no** persistence (no DB import)
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(domain-ledger): audit ledger event builder`

---

## Session 3a — packages/database

- **Model:** **Tier A**
- **Mode:** Agent
- **Required before running:** `.env` `DATABASE_URL` + `ENCRYPTION_KEY` set and DB reachable. Auto-run allows `npx prisma migrate dev` / `generate`.
- **Rules expected to load:** `database` (`packages/database/**`, `*.prisma`), `security` (Agent Requested — encryption/PII), `oop-and-domain-modeling`.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md

Build packages/database. Create the complete Prisma schema from Section 5 of
the build prompt, an AES-256-GCM encryption helper using the ENCRYPTION_KEY
env var (encrypt/decrypt for CNIC/NTN fields), and seed.ts matching Section 10
(5 societies, categories, dealers, buyers, bookings in various escrow states,
reviews ONLY on completed bookings). Add a migration installing a Postgres
trigger that blocks UPDATE and DELETE on the LedgerEvent table; document it as
ADR-004. Every model gets @@index on foreign keys used in frequent lookups.
```

**Test Gate:**
- [ ] `npx prisma migrate dev --name init` succeeds
- [ ] `npx prisma generate` succeeds
- [ ] `pnpm --filter @sectoria/database seed` runs clean
- [ ] `npx prisma studio` → 5 societies, categories, dealers, buyers, bookings in varied escrow states; reviews only on completed bookings
- [ ] Manual: attempt `UPDATE`/`DELETE` on `LedgerEvent` in `psql` → **rejected** by trigger
- [ ] ADR-004 file written in `docs/architecture/`
- [ ] Encryption helper round-trips (encrypt→decrypt) — verify a quick test or REPL
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(database): Prisma schema, encryption, seed data, and ledger trigger`

---

## Session 3b — packages/verification (parallel to 3a, separate chat)

- **Model:** **Tier A**
- **Mode:** Agent
- **Required before running:** verification API env vars **blank** (forces mocks). Session 1 types available.
- **Rules expected to load:** `verification-adapters` (`packages/verification/**`), `security`, `testing`.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md

Build packages/verification. Create typed interfaces for all four adapters
(NADRA, FBR ATL, DNFBP, PLRA), each with a mock implementation returning
schema-valid Pakistani demo data with a simulated 1–2s latency. A factory
function returns mocks when the API env vars are blank and real adapters when
set. Tests must verify each mock response parses against the corresponding
Zod schema from packages/types.
```

**Test Gate:**
- [ ] `pnpm --filter @sectoria/verification test` → all pass
- [ ] Four adapters (NADRA, FBR ATL, DNFBP, PLRA) each have interface + mock
- [ ] Factory returns **mock** when env blank (assert in a test)
- [ ] Each mock response `.parse()`s against its `packages/types` Zod schema
- [ ] Simulated latency present (1–2s) but not blocking tests unreasonably
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(verification): government API adapters with mock implementations`

---

## Session 4 — packages/ui

- **Model:** Tier B (fast)
- **Mode:** Agent
- **Rules expected to load:** `ui-design-system-sectoria` (`packages/ui/**`), `ui-ux-excellence-sectoria`, `code-clarity-and-comments`.
- **Design:** `@docs/design/Sectoria_Design_System.md` — implement Section 2 (tokens) and Section 5 (component specs) exactly.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md
@docs/design/Sectoria_Design_System.md

Build packages/ui per the Sectoria Design System spec. Start with theme.css —
a Tailwind v4 @theme block copying the complete token set from Section 2 of the
design spec (colors, spacing, fonts, radii, shadows, motion durations). Two
fonts only: Inter (--font-sans) and JetBrains Mono (--font-mono). Then build
every component from the file structure blueprint, each with a Storybook story,
in this order: StatusBadge (dot + text + tinted bg per Section 5.3),
TaxBreakdownCard, IdentityCard, CertificateCard, then primitives (Button, Input,
Select, Card, Table, Dialog, Skeleton, EmptyState, ErrorState, ProgressBar).
Every component shows all 5 states where applicable: loading (content-shaped
skeleton), empty (specific heading + CTA), error, partial, success. Include
formatPKR(), formatDate(), and maskCnic() helpers. NO business logic or data
fetching in any component. No inline hex/px values — tokens only.
```

**Test Gate:**
- [ ] `pnpm --filter @sectoria/ui storybook` opens; visually inspect each component + variants
- [ ] `theme.css` uses `@theme { ... }` (v4 CSS-first); token values match Section 2 of the design spec
- [ ] `grep` for inline `#[0-9a-fA-F]` or arbitrary `px` in `packages/ui/src` → none (tokens only)
- [ ] StatusBadge: dot + text + tinted background for all 4 semantic variants (success/warning/danger/info)
- [ ] Stateful components show all 5 states in Storybook (not just success)
- [ ] `formatPKR()`, `formatDate()`, and `maskCnic()` helpers exist and are used in domain components
- [ ] No `fetch`/tRPC/data calls inside components (`grep` check)
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(ui): design system components and Storybook stories`

---

## Session 5 — packages/api-client (tRPC)  ⚠️ upgraded to Tier A

- **Model:** **Tier A** — wires guards + money + DB transactions
- **Mode:** Agent
- **Required before running:** Sessions 1–3 green (types, all domain, database). DB reachable for integration tests.
- **Rules expected to load:** `api-trpc` (`packages/api-client/**`), `middleware-and-guards`, `auth-and-access-control` (Agent Requested), `security`, `testing`.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md

Build packages/api-client. Create the tRPC base setup (trpc.ts, context) and
named procedure variants: protectedProcedure, societyAdminProcedure,
dealerProcedure, verifiedBuyerProcedure — each enforcing role AND
resource-ownership guards. Build all routers (society, inventory-category,
booking, dealer, verification, review, admin). Each router composes domain
functions from packages/domain with persistence from packages/database; any
mutation that also writes a LedgerEvent MUST run inside a single Prisma
transaction (event + state change commit together or not at all). Write
integration tests for booking.router.ts covering the token-payment →
ALLOCATED escrow transition with a LedgerEvent created in the SAME transaction.
```

**Test Gate:**
- [ ] `pnpm --filter @sectoria/api-client test` → all pass
- [ ] `pnpm --filter @sectoria/api-client typecheck` → clean
- [ ] Integration test proves LedgerEvent + escrow transition commit **atomically** (force a failure → assert rollback leaves no orphan event)
- [ ] Each procedure variant enforces both role and ownership (spot-check a denied case)
- [ ] Routers call domain packages (not re-implementing tax/escrow logic inline)
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(api-client): tRPC routers with guards, domain composition, and tests`

---

## Session 6 — apps/web public marketplace

- **Model:** Tier B
- **Mode:** Agent
- **Required before running:** After this session, **connect Next.js DevTools MCP (build-doc 3.7)** once `pnpm dev` runs.
- **Rules expected to load:** `nextjs-app-router` (`apps/web/app/**`), `routing-and-navigation`, `seo` (`(marketplace)/**`), `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`.
- **Design:** Bento grid for homepage feature sections and society comparison (Section 4 + 8 of design spec). Import all UI from `@sectoria/ui` — no one-off styling.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md
@docs/design/Sectoria_Design_System.md

Build the public marketplace in apps/web. Create the (marketplace) route group:
homepage (bento grid feature sections per Section 4), /societies directory
(SSR with URL search-param filters), /societies/[city]/[society] profile (ISR,
revalidate 6h), /societies/[city]/[society]/[category] detail, /compare
(bento comparison layout, max 2 societies side-by-side on mobile), and /dealers
directory. Use @sectoria/ui components and tokens only — no inline colors or
arbitrary spacing. Every data-bearing section shows all 5 states (loading skeleton,
empty with CTA, error with recovery, partial, success). Verification/trust badges
must include a label or tooltip explaining what they mean — never a bare icon.
Every page: generateMetadata with unique title/description, JSON-LD
(Organization, RealEstateListing, BreadcrumbList), dynamic opengraph-image.tsx
for society pages, and a sitemap.ts entry. ALL params/searchParams must be
awaited (Next.js 16 async params). Mobile-first: layout must work at 390px.
```

**Test Gate:**
- [ ] `pnpm dev` boots; pages render at `http://localhost:3000`
- [ ] **Connect Next.js DevTools MCP now (3.7)** — green "Connected"
- [ ] Lighthouse (DevTools → Lighthouse): **SEO ≥ 90** and **Performance ≥ 90**
- [ ] View source / JSON-LD validator: Organization + RealEstateListing + BreadcrumbList present
- [ ] `grep`-check: no synchronous `params.`/`searchParams.` access without `await`
- [ ] `sitemap.ts` includes society + category routes; OG image renders
- [ ] Homepage and /compare use bento grid layout (not a flat card dump)
- [ ] Trust/verification badges have visible labels or tooltips (not icon-only)
- [ ] Spot-check at 390px viewport: no horizontal overflow; touch targets ≥ 44px
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(web): public marketplace with SSR/ISR and full SEO`

---

## Session 7 — Buyer dashboard + booking wizard

- **Model:** Tier B for UI; **switch to Tier A** for the Step-2 tax + escrow logic wiring
- **Mode:** Agent
- **Rules expected to load:** `nextjs-app-router`, `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`, `routing-and-navigation`, `auth-and-access-control`, `security`.
- **Design:** Highest-stakes trust UX session — follow Section 8 (Sectoria-specific patterns): ATL tax implications, money confirm dialogs, certificate stamp animation.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md
@docs/design/Sectoria_Design_System.md

Build the (buyer) route group in apps/web: buyer dashboard (bento metric layout),
bookings list, booking detail (escrow state timeline + LedgerEvent audit trail),
and the 5-step wizard at /dashboard/booking/[categoryId]:
  Step 1 — NADRA CNIC verification via the verification router (NADRA scan-bar
           animation per Section 7 — not a generic spinner)
  Step 2 — tax calculation via the tax domain package (live recalculation as
           inputs change); show ATL status WITH its tax implication beneath
           (e.g. "Filer: 3% purchase tax applies" per Section 8)
  Step 3 — tax summary review (TaxBreakdownCard from @sectoria/ui)
  Step 4 — payment (escrow token; PKR amount via formatPKR(); confirm dialog
           before payment — never a toast for money actions)
  Step 5 — allocation result + certificate display (stamp reveal animation,
           specific success copy, download/share buttons)
Each step must be independently URL-addressable so a refresh preserves
progress. Display CNIC only via maskCnic() — never in full. PKR amounts via
formatPKR() everywhere. Wizard shows a clear progress indicator. All 5 states
on every data-bearing screen.
```

**Test Gate:**
- [ ] `pnpm dev` → walk the full wizard with a seeded buyer account
- [ ] Each step is its own URL; refresh mid-flow preserves progress
- [ ] Step 2 tax numbers match `domain/tax` outputs (no re-implemented math)
- [ ] Step 2 shows ATL status with tax implication text beneath it
- [ ] Step 4 payment uses a confirm dialog (not a toast) describing the PKR amount
- [ ] Step 5 certificate has stamp animation + specific success confirmation copy
- [ ] `npx prisma studio` → LedgerEvent rows created across the transitions
- [ ] CNIC shown masked everywhere (no full CNIC in DOM/logs)
- [ ] PKR amounts formatted via `formatPKR()` (no raw numbers or "Rs.")
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(web): buyer dashboard and 5-step booking wizard`

---

## Session 8 — Society portal

- **Model:** Tier B
- **Mode:** Agent
- **Rules expected to load:** `nextjs-app-router`, `auth-and-access-control`, `security`, `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`.
- **Design:** Dashboard bento layout (Section 4); sidebar per Section 6; money confirmations for booking receipt actions.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md
@docs/design/Sectoria_Design_System.md

Build the (society) route group in apps/web: overview dashboard (bento grid
for compliance score, HSMS status, active bookings per Section 4), inventory
management (category list with mobile card view for tables), partner authorization
(list dealers with active/revoked status, add/revoke a dealer per category),
booking confirmation queue (incoming bookings awaiting action; confirm payment
receipt via confirm dialog with PKR amount — not a toast, issue allotment
document), settings (LOP/NOC upload, HSMS link status). Sidebar navigation per
Section 6 (hamburger < 768px, icon-only 768–1024px, full labels > 1024px).
Use @sectoria/ui components; all 5 states on data-bearing screens. EVERY
mutation must enforce resource ownership — a society admin can act ONLY on
their own society's data.
```

**Test Gate:**
- [ ] `pnpm dev` → log in as seeded society admin
- [ ] **Ownership test:** edit URL to another society's ID → access **denied** (not 200)
- [ ] Create/edit category, add/revoke dealer, confirm a booking all work
- [ ] Booking payment confirmation uses a confirm dialog (not a toast)
- [ ] Dashboard uses bento grid layout for key metrics
- [ ] Inventory/booking tables have a mobile card view (not horizontal scroll)
- [ ] Mutations route through `societyAdminProcedure` guards
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(web): society admin portal`

---

## Session 9 — Dealer portal

- **Model:** Tier B
- **Mode:** Agent
- **Rules expected to load:** `nextjs-app-router`, `auth-and-access-control`, `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`.
- **Design:** Trust score gauge animation (Section 7); verification badges with explanatory labels (Section 8).

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md
@docs/design/Sectoria_Design_System.md

Build the (dealer) route group in apps/web: dealer dashboard (bento layout),
DNFBP certificate verification submission (upload cert number, submit for
spot-check via the DNFBP adapter; show verified/pending/rejected with StatusBadge
dot + text + tinted bg), lead pipeline (buyer enquiries from societies the
dealer is authorized for, with NADRA-verified badge + ATL status and its tax
implication), and a trust score page (component breakdown from the trust-score
domain package with gauge fill animation per Section 7). Use @sectoria/ui
components; all 5 states on data-bearing screens. Verification badges must
include a label or tooltip — never a bare checkmark.
```

**Test Gate:**
- [ ] `pnpm dev` → log in as seeded dealer
- [ ] DNFBP submission flows through the verification adapter (pending→verified mock)
- [ ] Lead pipeline only shows leads from societies the dealer is authorized for
- [ ] Trust score breakdown matches `domain/trust-score` output
- [ ] Trust score page has gauge/progress animation (not static numbers only)
- [ ] Verification badges have visible labels or tooltips
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(web): dealer portal`

---

## Session 10 — Admin portal

- **Model:** Tier B (watch the LedgerEvent writes carefully)
- **Mode:** Agent
- **Rules expected to load:** `nextjs-app-router`, `auth-and-access-control`, `security`, `database`, `ui-design-system-sectoria`, `ui-ux-excellence-sectoria`.
- **Design:** Revenue dashboard bento layout; ledger viewer mobile card view; approve/reject uses confirm dialog with reason field.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md
@docs/design/Sectoria_Design_System.md

Build the (admin) route group in apps/web: admin dashboard (bento metric
layout), verification queue (societies + dealers awaiting approval; approve/reject
via confirm dialog that requires a reason — updates VerificationTier AND logs a
LedgerEvent), full ledger viewer (search/filter by entityId, event type, date
range; mobile card view for table data), disputes page (flag/resolve disputed
plots), revenue dashboard (bento layout: transfers completed this month, total
escrow released, commission by society; PKR via formatPKR()). Use @sectoria/ui
components; all 5 states on data-bearing screens. EVERY admin action writes a
LedgerEvent tagged with the admin's userId and a reason field.
```

**Test Gate:**
- [ ] `pnpm dev` → log in as seeded super admin
- [ ] Approve/reject updates VerificationTier and creates a LedgerEvent (check Studio)
- [ ] Approve/reject uses a confirm dialog requiring a reason (not a one-click action)
- [ ] Every admin LedgerEvent carries `userId` + non-empty `reason`
- [ ] Ledger viewer filters by entityId / type / date range
- [ ] Revenue dashboard uses bento layout; PKR amounts via `formatPKR()`
- [ ] Revenue numbers reconcile against seeded completed transfers
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `feat(web): admin portal`

---

## Session 11 — Security hardening  ⚠️ Tier A

- **Model:** **Tier A (strongest)**
- **Mode:** Agent
- **Attach:** only `@docs/Sectoria_Cursor_Prompt.md` (no file-structure needed)
- **Rules expected to load:** `security` (Agent Requested), `middleware-and-guards`, `auth-and-access-control`, `database`.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md

Perform a full security audit against security.mdc. Check and FIX each:
1. next.config.ts — Content-Security-Policy, X-Frame-Options,
   Strict-Transport-Security, Referrer-Policy headers all set
2. Every auth, booking-initiation, and verification-triggering endpoint has
   @upstash/ratelimit applied
3. Search the whole codebase for any console.log / error message / DB query
   that could contain a raw CNIC or NTN — replace with masked value or entity ID
4. Every webhook handler (escrow, verification) verifies the request signature
   BEFORE processing the payload
5. The LedgerEvent Postgres trigger (Session 3a) still exists in the latest migration
6. Run `pnpm turbo run typecheck` and fix any remaining type errors
Report what you changed for each of the 6 items.
```

**Test Gate:**
- [ ] Security headers present in `next.config.ts` (verify response headers in browser/curl)
- [ ] Rate limiting confirmed on auth + booking + verification endpoints
- [ ] Codebase `grep` for raw CNIC/NTN patterns → none in logs/errors/queries
- [ ] Webhook handlers verify signature **before** body processing (read the code)
- [ ] LedgerEvent immutability trigger still present in latest migration
- [ ] `pnpm turbo run test lint typecheck` → **zero** errors
- [ ] Commit + push: `security: headers, rate limiting, PII audit, and webhook verification`

---

## Session 12 — Documentation pass

- **Model:** Tier B
- **Mode:** Agent
- **Attach:** only `@docs/Sectoria_Cursor_Prompt.md`
- **Rules expected to load:** `documentation` (Agent Requested), `code-clarity-and-comments`.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md

Documentation pass per documentation.mdc. For each package in packages/*:
ensure README.md has a working, current usage example. For packages/ui:
README must link to @docs/design/Sectoria_Design_System.md and document
formatPKR(), formatDate(), and maskCnic() usage. For every exported
function in packages/domain/* and packages/verification/*: add/complete TSDoc
including @see references to the relevant legal section (e.g. @see Section 236C).
Fill in the ADR files in docs/architecture/ with the actual decisions made
during this build. Update docs/architecture/access-rights-matrix.md with any
actions added in Sessions 8–10 that don't yet have a row.
```

**Test Gate:**
- [ ] Every `packages/*` README has a runnable usage example
- [ ] `packages/ui/README.md` links to `docs/design/Sectoria_Design_System.md` and documents formatting helpers
- [ ] Exported domain/verification functions have TSDoc with `@see` legal refs
- [ ] ADR files reflect real decisions (incl. ADR-004 ledger trigger)
- [ ] `access-rights-matrix.md` updated for Session 8–10 actions
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `docs: complete READMEs, TSDoc, ADRs, and access rights matrix`

---

## Session 13 — E2E Playwright suite

- **Model:** Tier B
- **Mode:** Agent
- **Required before running:** verification env vars **blank** (mock adapters only in CI).
- **Rules expected to load:** `testing` (`e2e/**`, `*.spec.ts`), `nextjs-app-router`.
- **Design:** No design spec attachment — E2E validates flows, not visuals. Assert on visible trust copy (tax implications, certificate confirmation) where the critical path touches them.

**Prompt:**
```
@docs/Sectoria_Cursor_Prompt.md @docs/Sectoria_File_Structure.md

Build the Playwright critical-path test in e2e/critical-path.spec.ts per
testing.mdc, using seeded mock data end-to-end:
(1) browse society directory, (2) open a society profile, (3) open compare
with two societies, (4) select a category and open the booking wizard,
(5) complete CNIC verification via the mock NADRA adapter, (6) confirm the tax
breakdown is displayed correctly, (7) complete the token-payment step,
(8) confirm the allocation result shows a plot number + certificate.
Run against MOCK adapters only — no real government API calls in CI.
```

**Test Gate:**
- [ ] `npx playwright test` → all pass
- [ ] `npx playwright show-report` → all 8 steps visible and green
- [ ] Wizard step 2 asserts ATL tax implication text is visible (not just raw numbers)
- [ ] Final step asserts certificate/allocation confirmation copy is specific (not generic "Success")
- [ ] Test uses mock adapters only (no real API env vars referenced)
- [ ] CI workflow (`.github/workflows/ci.yml`) runs the E2E suite
- [ ] `pnpm turbo run test lint typecheck` clean
- [ ] Commit + push: `test(e2e): complete critical-path Playwright suite`

---

## Quality Gate — run between EVERY session

```bash
pnpm turbo run test lint typecheck
```

All three must pass before you commit and move on. If anything fails, paste the **exact** red error lines (not the whole log) into the current chat and ask Cursor to fix it before advancing.

## Fast triage (from build-doc Part 6)

| Symptom | Action |
|---|---|
| `pnpm install` version conflict | `cat docs/architecture/dependency-baseline.md` → tell Cursor the correct version per baseline |
| Test fails after new code | Paste red lines → "fix without changing the test file, the test is correct" |
| Domain package imports Prisma/Next/React | "Violates architecture.mdc boundary — move logic to packages/api-client" |
| `apps/web` build error | If Next.js DevTools MCP connected (3.7), Cursor reads it directly; else paste full stack trace |
| CNIC/NTN in a log/error | STOP → "replace every plaintext CNIC/NTN with mask-cnic or entity ID" |
| Inline hex colors / arbitrary spacing in UI | "Violates ui-design-system-sectoria.mdc — add a token to theme.css and use it" |
| Money action uses a toast instead of confirm dialog | "Violates ui-ux-excellence-sectoria.mdc — use a confirm dialog with PKR amount and consequence" |

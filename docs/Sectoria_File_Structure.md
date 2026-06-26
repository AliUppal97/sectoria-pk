# Sectoria Society Marketplace — Complete File & Directory Blueprint

This is the full list of files this codebase needs, organized exactly as
they should sit on disk. Nothing here is optional filler — every file
maps to a piece of functionality or a rule already established in the
Cursor build prompt and the `.cursor/rules/*.mdc` specification set. Use
this as your scaffolding checklist before writing any code.

Build order note: don't create these top-to-bottom as written. Follow the
implementation order from the build prompt — `packages/types` first, then
`packages/domain/*` (with tests), then `packages/database`, then
`packages/verification`, then `packages/ui`, then `packages/api-client`,
and only then `apps/web`. The tree below is organized for *reference*, not
*sequence*.

---

## Root level

```
sectoria-pk/
├── package.json                          # root workspace manifest, scripts (dev/build/test/lint)
├── pnpm-workspace.yaml                    # workspace package globs + version catalog
├── turbo.json                             # task pipeline (build/test/lint/typecheck dependencies)
├── tsconfig.json                          # root tsconfig — references all packages
├── .gitignore
├── .env.example                           # every required env var, placeholder values only
├── .nvmrc                                 # pins Node 22 LTS
├── README.md                              # architecture overview + setup instructions
│
├── .cursor/
│   └── rules/                             # the 22 .mdc files — already built, copy in as-is
│       ├── 000-core.mdc
│       ├── architecture.mdc
│       ├── oop-and-domain-modeling.mdc
│       ├── code-clarity-and-comments.mdc
│       ├── domain-logic.mdc
│       ├── verification-adapters.mdc
│       ├── database.mdc
│       ├── json-and-config-conventions.mdc
│       ├── api-trpc.mdc
│       ├── auth-and-access-control.mdc
│       ├── middleware-and-guards.mdc
│       ├── routing-and-navigation.mdc
│       ├── nextjs-app-router.mdc
│       ├── ui-design-system.mdc
│       ├── ui-ux-excellence.mdc
│       ├── security.mdc
│       ├── seo.mdc
│       ├── scalability-and-performance.mdc
│       ├── testing.mdc
│       ├── dependency-management.mdc
│       ├── documentation.mdc
│       └── git-workflow.mdc
│
├── .github/
│   └── workflows/
│       └── ci.yml                         # turbo run test lint typecheck on every PR
│
├── docs/
│   ├── architecture/
│   │   ├── dependency-baseline.md         # already built — pinned versions
│   │   ├── access-rights-matrix.md        # already built — role × resource × action
│   │   ├── ADR-001-modular-monolith.md    # why one app, many packages, not microservices
│   │   ├── ADR-002-prisma-over-drizzle.md
│   │   ├── ADR-003-trpc-over-rest.md
│   │   ├── ADR-004-ledger-immutability.md # why/how LedgerEvent is INSERT-only
│   │   ├── ADR-005-encryption-key-rotation.md
│   │   └── ADR-006-sitemap-scaling.md
│   ├── runbooks/
│   │   ├── swapping-verification-adapters.md
│   │   ├── rotating-encryption-keys.md
│   │   └── scaling-sitemap-beyond-50k-urls.md
│   └── api/
│       └── openapi.json                   # generated, not hand-written — gitignore or commit post-build
│
└── e2e/
    ├── playwright.config.ts
    └── critical-path.spec.ts              # browse → compare → book → verify → pay → allocate
```

---

## `packages/types` — shared Zod schemas (build this first)

```
packages/types/
├── package.json
├── tsconfig.json
├── README.md                              # usage example required before anything imports this
└── src/
    ├── index.ts                           # barrel export — everything else imports from here
    ├── common.ts                          # Pkr amount, Cnic, Ntn, Slug branded types/schemas
    ├── society.ts                         # Society, VerificationTier schemas
    ├── inventory-category.ts              # InventoryCategory, PlotType, AllocationStrategy
    ├── plot.ts                            # Plot, PlotStatus
    ├── payment-plan.ts                    # PaymentPlan
    ├── booking.ts                         # Booking
    ├── escrow.ts                          # EscrowState, EscrowAction, EscrowEvent
    ├── user.ts                            # User, UserRole, AtlStatus
    ├── dealer-profile.ts                  # DealerProfile
    ├── society-partner-authorization.ts   # SocietyPartnerAuthorization, AuthorizationStatus
    ├── review.ts                          # Review
    ├── ledger-event.ts                    # LedgerEvent, LedgerEventType
    ├── tax.ts                             # TaxCalculationInput, TaxBreakdown, TaxRateTable
    └── verification.ts                    # NadraVerificationResult, AtlStatusResult, DnfbpVerificationResult, PlraCertificate
```

---

## `packages/domain` — pure business logic (build second, tests alongside each file)

```
packages/domain/
├── tax/
│   ├── package.json
│   ├── README.md
│   └── src/
│       ├── index.ts
│       ├── calculate-transfer-tax.ts      # the core function — see domain-logic.mdc
│       ├── tax-rate-table.ts              # CURRENT_FISCAL_YEAR_RATES + versioned history
│       ├── errors.ts                      # InvalidTaxInputError, etc.
│       └── __tests__/
│           └── calculate-transfer-tax.test.ts
│
├── allocation/
│   ├── package.json
│   ├── README.md
│   └── src/
│       ├── index.ts
│       ├── allocate-plot.ts
│       ├── strategies/
│       │   ├── fifo-strategy.ts
│       │   └── ballot-strategy.ts
│       └── __tests__/
│           └── allocate-plot.test.ts
│
├── balloting/
│   ├── package.json
│   ├── README.md
│   └── src/
│       ├── index.ts
│       ├── run-ballot.ts                  # deterministic, seeded draw
│       ├── seed-utils.ts                  # SHA-256 hashing of input set
│       └── __tests__/
│           └── run-ballot.test.ts
│
├── escrow/
│   ├── package.json
│   ├── README.md
│   └── src/
│       ├── index.ts
│       ├── transition-escrow-state.ts
│       ├── state-machine-definition.ts    # the full legal-transition table
│       ├── errors.ts                      # InvalidEscrowTransitionError
│       └── __tests__/
│           └── transition-escrow-state.test.ts
│
├── trust-score/
│   ├── package.json
│   ├── README.md
│   └── src/
│       ├── index.ts
│       ├── calculate-trust-score.ts
│       ├── default-weights.ts             # 50/20/15/10/5 split, see domain-logic.mdc
│       └── __tests__/
│           └── calculate-trust-score.test.ts
│
└── ledger/
    ├── package.json
    ├── README.md
    └── src/
        ├── index.ts
        ├── create-ledger-event.ts
        ├── event-types.ts
        └── __tests__/
            └── create-ledger-event.test.ts
```

---

## `packages/verification` — government API adapters (build third)

```
packages/verification/
├── package.json
├── README.md
└── src/
    ├── index.ts
    ├── factory.ts                         # createVerificationAdapters(config)
    ├── nadra/
    │   ├── interface.ts                   # NadraVerificationAdapter
    │   ├── mock-adapter.ts                # MockNadraAdapter — realistic latency + demo data
    │   └── real-adapter.ts                # stub — throws until real credentials wired
    ├── fbr-atl/
    │   ├── interface.ts                   # FbrAtlAdapter
    │   ├── mock-adapter.ts
    │   └── real-adapter.ts
    ├── dnfbp/
    │   ├── interface.ts                   # DnfbpVerificationAdapter
    │   ├── mock-adapter.ts
    │   └── real-adapter.ts
    ├── plra/
    │   ├── interface.ts                   # PlraCertificateAdapter
    │   ├── mock-adapter.ts
    │   └── real-adapter.ts
    └── __tests__/
        ├── factory.test.ts
        └── mock-adapters.test.ts          # asserts mock responses match Zod schemas
```

---

## `packages/database` — Prisma schema, client, seed, encryption (build fourth)

```
packages/database/
├── package.json
├── README.md
├── .env.example                           # DATABASE_URL placeholder
├── prisma/
│   ├── schema.prisma                      # the full schema from the build prompt
│   ├── migrations/
│   │   └── .gitkeep                       # populated by `prisma migrate dev`
│   └── seed.ts                            # 5 societies, categories, dealers, buyers, bookings, reviews
└── src/
    ├── index.ts                           # exports the Prisma client singleton
    ├── client.ts
    ├── encryption.ts                      # AES-256-GCM helpers for CNIC/NTN
    └── __tests__/
        └── encryption.test.ts
```

---

## `packages/ui` — design system + Storybook (build fifth)

```
packages/ui/
├── package.json
├── README.md
├── .storybook/
│   ├── main.ts
│   └── preview.ts
└── src/
    ├── theme.css                          # Tailwind v4 @theme block — single source of design tokens
    ├── index.ts                           # barrel export
    ├── lib/
    │   ├── format-pkr.ts                  # "PKR X,XXX,XXX" formatter
    │   ├── mask-cnic.ts                   # "35202-XXXXX-X" masking
    │   └── utils.ts                       # cn() classnames helper
    ├── hooks/
    │   └── use-debounced-value.ts
    ├── seo/
    │   └── JsonLd.tsx                     # typed JSON-LD renderer, see seo.mdc
    └── components/
        ├── button.tsx
        ├── badge.tsx                      # StatusBadge, AtlBadge, VerificationBadge variants
        ├── badge.stories.tsx
        ├── card.tsx
        ├── card.stories.tsx
        ├── input.tsx
        ├── input.stories.tsx
        ├── select.tsx
        ├── select.stories.tsx
        ├── dialog.tsx
        ├── dialog.stories.tsx
        ├── table.tsx
        ├── table.stories.tsx
        ├── skeleton.tsx
        ├── skeleton.stories.tsx
        ├── empty-state.tsx                # the required "empty" state from ui-ux-excellence.mdc
        ├── empty-state.stories.tsx
        ├── error-state.tsx                # the required "error" state
        ├── error-state.stories.tsx
        ├── progress-bar.tsx
        ├── progress-bar.stories.tsx
        ├── tax-breakdown-card.tsx         # the tax invoice UI, reused across calculator + wizard
        ├── tax-breakdown-card.stories.tsx
        ├── identity-card.tsx              # post-NADRA-verification identity display
        ├── identity-card.stories.tsx
        ├── certificate-card.tsx           # the PLRA certificate visual
        └── certificate-card.stories.tsx
```

---

## `packages/api-client` — tRPC composition root (build sixth)

```
packages/api-client/
├── package.json
├── README.md
└── src/
    ├── index.ts
    ├── trpc.ts                            # initTRPC, context creation, base procedure
    ├── procedures.ts                      # protectedProcedure, societyAdminProcedure, dealerProcedure, etc.
    ├── root-router.ts                     # merges all routers below
    ├── middleware/
    │   ├── require-role.ts                # see auth-and-access-control.mdc
    │   ├── require-society-ownership.ts
    │   ├── require-nadra-verified.ts
    │   └── rate-limit.ts                  # @upstash/ratelimit wrapper
    ├── routers/
    │   ├── society.router.ts              # CRUD + listing for societies
    │   ├── inventory-category.router.ts   # category management, pricing, payment plans
    │   ├── booking.router.ts              # the core booking/escrow flow procedures
    │   ├── dealer.router.ts               # dealer profile, DNFBP verification, leads
    │   ├── verification.router.ts         # NADRA/FBR verification trigger procedures
    │   ├── review.router.ts               # post-booking review submission
    │   └── admin.router.ts                # moderation, ledger viewer, disputes, revenue
    └── __tests__/
        ├── booking.router.test.ts
        └── society.router.test.ts
```

---

## `packages/config` — shared tooling presets

```
packages/config/
├── package.json
├── eslint/
│   ├── base.js                            # flat config — shared rules
│   └── nextjs.js                          # extends base + Next.js-specific rules
└── typescript/
    ├── base.json
    ├── nextjs.json
    └── react-library.json                 # used by packages/ui
```

---

## `apps/web` — the Next.js application (build last)

```
apps/web/
├── package.json
├── next.config.ts                         # security headers, CSP, redirects()
├── auth.ts                                # Auth.js v5 config — handlers/auth/signIn/signOut
├── middleware.ts                          # route-group gating, see middleware-and-guards.mdc
├── public/
│   └── favicon.ico
└── app/
    ├── layout.tsx                         # root layout, imports packages/ui theme.css
    ├── globals.css
    │
    ├── (marketplace)/                     # PUBLIC — see seo.mdc for every page here
    │   ├── layout.tsx
    │   ├── page.tsx                       # homepage
    │   ├── sitemap.ts
    │   ├── robots.ts
    │   ├── societies/
    │   │   ├── page.tsx                   # directory + filters (SSR, filters as search params)
    │   │   └── [city]/
    │   │       └── [society]/
    │   │           ├── page.tsx           # society profile (ISR, 6hr revalidate)
    │   │           ├── opengraph-image.tsx
    │   │           └── [category]/
    │   │               └── page.tsx       # category detail + "book this" entry point
    │   ├── compare/
    │   │   └── page.tsx                   # side-by-side comparison tool
    │   └── dealers/
    │       ├── page.tsx                   # verified dealer directory
    │       └── [slug]/
    │           └── page.tsx               # dealer public profile + trust score
    │
    ├── (buyer)/                           # Auth: BUYER
    │   ├── layout.tsx
    │   └── dashboard/
    │       ├── page.tsx
    │       ├── bookings/
    │       │   ├── page.tsx
    │       │   └── [bookingId]/
    │       │       └── page.tsx           # booking detail + ledger/audit trail view
    │       ├── profile/
    │       │   └── page.tsx
    │       └── booking/
    │           └── [categoryId]/
    │               └── page.tsx           # the booking/verification/escrow wizard
    │
    ├── (society)/                         # Auth: SOCIETY_ADMIN
    │   ├── layout.tsx
    │   └── society-portal/
    │       ├── page.tsx                   # overview dashboard
    │       ├── inventory/
    │       │   ├── page.tsx
    │       │   ├── new/
    │       │   │   └── page.tsx
    │       │   └── [categoryId]/
    │       │       └── page.tsx           # pricing, payment plans, availability
    │       ├── partners/
    │       │   └── page.tsx               # authorize/revoke dealer partners
    │       ├── bookings/
    │       │   ├── page.tsx               # incoming booking queue
    │       │   └── [bookingId]/
    │       │       └── page.tsx           # confirm payment, issue certificate
    │       └── settings/
    │           └── page.tsx               # LOP/NOC docs, HSMS link status
    │
    ├── (dealer)/                          # Auth: DEALER_PARTNER
    │   ├── layout.tsx
    │   └── dealer-portal/
    │       ├── page.tsx
    │       ├── leads/
    │       │   └── page.tsx
    │       ├── verification/
    │       │   └── page.tsx               # DNFBP certificate submission
    │       └── trust-score/
    │           └── page.tsx
    │
    ├── (admin)/                           # Auth: SUPER_ADMIN
    │   ├── layout.tsx
    │   └── admin/
    │       ├── page.tsx
    │       ├── verification-queue/
    │       │   └── page.tsx
    │       ├── ledger/
    │       │   └── page.tsx               # full audit trail viewer
    │       ├── disputes/
    │       │   └── page.tsx
    │       └── revenue/
    │           └── page.tsx               # revenue dashboard by stream
    │
    └── api/
        ├── auth/
        │   └── [...all]/
        │       └── route.ts               # Auth.js v5 — exports { GET, POST }
        ├── trpc/
        │   └── [trpc]/
        │       └── route.ts
        └── webhooks/
            ├── escrow/
            │   └── route.ts               # verify signature, then process
            └── verification/
                └── route.ts
```

---

## File count summary (for sizing the work)

| Area | Approx. file count |
|---|---|
| Root + tooling config | ~10 |
| `.cursor/rules` | 22 (already done) |
| `docs/` | ~12 |
| `packages/types` | ~15 |
| `packages/domain` (6 sub-packages) | ~36 |
| `packages/verification` | ~16 |
| `packages/database` | ~8 |
| `packages/ui` | ~30 |
| `packages/api-client` | ~16 |
| `packages/config` | ~6 |
| `apps/web` | ~45 |
| `e2e` | ~2 |
| **Total** | **~220 files** |

This is a real but entirely manageable scope for an AI-assisted build at the
pace discussed earlier (4–6 weeks). The count looks large mainly because of
the deliberate per-package `README.md`/`package.json`/test-file pattern —
not because any single piece is complex on its own.

## Suggested first three Cursor sessions

1. **Session 1**: root config + `packages/types` + `packages/config`. Nothing
   runs yet, but every later package can import real types immediately.
2. **Session 2**: `packages/domain/*` one sub-package at a time, tests
   passing before moving to the next. This is the highest-value, lowest-risk
   work to get right early — see `domain-logic.mdc`.
3. **Session 3**: `packages/database` (schema + seed) and
   `packages/verification` (mocks) in parallel — both are needed before
   `packages/api-client` can be wired up meaningfully.

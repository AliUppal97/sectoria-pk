# 🏗️ SECTORIA SOCIETY MARKETPLACE
## One-Shot Cursor Build Prompt — Production-Grade, Reusable, Scalable Architecture

---

> **COPY EVERYTHING BELOW THIS LINE INTO CURSOR AS YOUR FIRST PROMPT**

---

## MASTER BUILD PROMPT

You are a world-class senior software architect and full-stack engineer building **Sectoria.pk** — Pakistan's first verified-society real estate platform — from scratch, to production standards.

This is **not** a quick MVP demo. Every piece of business logic must live in a framework-agnostic, fully-documented, fully-tested package that could be reused across multiple frontends (web, mobile, admin tools) or even extracted into its own service later without rewriting it. Treat this as a real company's core codebase on day one.

**The product**: Buyers browse a directory of verified housing societies, compare their phases/categories/pricing/payment plans side-by-side, and book a plot/file category directly. Societies are the sellers of record. Authorized dealers act as society-approved sales partners. All bookings go through escrow, NADRA/FBR verification, and produce PLRA-compliant documentation.

**Non-negotiable principles**:
1. **Domain logic is pure and isolated.** Tax calculations, allocation/balloting, escrow state transitions, and trust scoring live in framework-agnostic TypeScript packages with zero UI or database dependencies — testable in isolation, documented with legal/business citations inline.
2. **Government integrations are adapters.** NADRA, FBR, DNFBP, and PLRA each get a typed interface + a mock implementation. Swapping mock → real API later means writing one new file, touching nothing else.
3. **Everything is Zod-validated at every boundary** — tRPC procedures, forms, environment variables, even seed data.
4. **SEO is architectural, not an afterthought.** Public society/category pages are server-rendered with structured data, dynamic sitemaps, and dynamic OG images from day one.
5. **Security is layered**: RBAC middleware, field-level encryption for CNIC/NTN, rate limiting, audit logging via an append-only ledger, strict CSP headers.
6. **Documentation is part of the deliverable**, not a TODO. Every package has a README with usage examples; every exported domain function has TSDoc; architecture decisions are recorded as ADRs; UI components are documented in Storybook.
7. **Dependency versions are pinned and verified, never guessed.** Use the baseline in Section 11 as the starting point, but confirm the exact current stable version of fast-moving packages (`next-auth`/Auth.js, `@trpc/server`, `tailwindcss`) against npm before installing, since this prompt has a point-in-time knowledge cutoff and these ecosystems ship updates frequently. Every package in the monorepo must resolve to one consistent version of any shared dependency.

Do not ask for clarification — make industry-standard decisions and build. Start with the monorepo skeleton, then the domain packages (with tests), then the database schema, then the app.

---

## 1. TECH STACK (verified compatible as of June 2026)

```
Monorepo:        Turborepo + pnpm workspaces
Language:        TypeScript 5.x (strict: true everywhere — no `any`)
Runtime:         Node.js 22 LTS
Framework:       Next.js 16 (App Router, Turbopack — now the stable default bundler)
API layer:       tRPC v11 (Zod-validated procedures, end-to-end type inference)
Styling:         Tailwind CSS v4 + shadcn/ui (CSS-first @theme config)
Database:        PostgreSQL + Prisma ORM
Auth:            Auth.js / NextAuth v5 (@auth/prisma-adapter)
Validation:      Zod (API boundaries, forms, env vars, seed data)
Server state:    TanStack Query (via tRPC's built-in React Query bindings)
Client state:    Zustand
Queue/Jobs:      BullMQ + Redis (verification calls, doc generation, notifications)
Caching:         Redis (rate limiting, session, ISR support)
File storage:    S3-compatible (certificates, images, documents)
Testing:         Vitest (unit/domain) + Playwright (E2E)
Docs:            TSDoc → TypeDoc, Storybook, tRPC-OpenAPI
Linting:         ESLint 9 (flat config) + Prettier
```

This combination — Next.js + tRPC + Prisma + Auth.js + Tailwind + Zod — is the current dominant production stack for exactly this kind of project (it's the same combination the widely-used T3 stack scaffolds), so compatibility between these specific pieces is well-trodden. Two changes from the original draft and why:

- **tRPC v11 is now first-class**, not optional. It replaces the need for a hand-rolled typed API client — Zod schemas in `packages/types` flow straight through to fully-typed React Query hooks on the frontend, with zero manual type duplication. This directly serves the "reusable, well-documented" goal: one schema change propagates everywhere with compile errors at every stale call site.
- **Prisma over Drizzle**: Drizzle has an edge-runtime/performance edge, but Prisma's migration tooling, Prisma Studio, and documentation generation give a solo/small team a much better day-to-day experience — and this project isn't edge-deployed. Record this trade-off as ADR-002 so it's revisited if the calculus changes later.

### 1.1 Compatibility Notes — Read Before Scaffolding

These prevent the most common AI-agent mistakes when generating Next.js 16 code, and set Cursor up for faster iteration:

1. **`params` and `searchParams` are async everywhere.** Since Next.js 15, pages/layouts/route handlers receive `params` and `searchParams` as `Promise`s that must be `await`ed. AI agents trained on older patterns often write `params.id` directly, which fails to build. Every dynamic route here (`[city]/[society]/[category]`) must use `const { city, society } = await params`.

2. **Tailwind v4 is CSS-first.** There's no `tailwind.config.ts` by default — design tokens (colors, spacing, fonts) live in `@theme` blocks inside CSS. `packages/ui` exports a single `theme.css` with the shared `@theme` block that every app imports, giving one source of truth for the design system without a JS preset.

3. **Auth.js v5 uses a single `auth.ts` config exporting `handlers`/`auth`/`signIn`/`signOut`**, not the old `[...nextauth]/route.ts` options-object pattern from v4. The adapter package is `@auth/prisma-adapter` — the older `@next-auth/prisma-adapter` is deprecated and will cause type mismatches if mixed in.

4. **Enable Next.js's Agent DevTools / MCP server for Cursor.** Next.js 16.2+ ships an agent-ready `create-next-app` and a DevTools MCP server giving Cursor direct access to build errors, browser console logs, and React DevTools diagnostics. Point Cursor at this MCP server at the start of the session — it lets Cursor self-debug build/runtime errors instead of guessing from terminal output, which materially speeds up iteration on a project this size.

---

## 2. MONOREPO STRUCTURE

A **modular monolith**: one deployable Next.js app, organized by route groups per portal, with all business logic extracted into independently-versioned packages. This gives you reusability and clean boundaries now, with a documented migration path to split into separate services/apps later if scale demands it (record this decision as ADR-001).

```
sectoria-pk/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (marketplace)/        # PUBLIC — SEO critical
│       │   │   ├── page.tsx                      # Homepage
│       │   │   ├── societies/
│       │   │   │   ├── page.tsx                  # Directory + filters
│       │   │   │   └── [city]/[society]/
│       │   │   │       ├── page.tsx              # Society profile (ISR)
│       │   │   │       ├── opengraph-image.tsx   # Dynamic OG image
│       │   │   │       └── [category]/page.tsx   # Category/plan detail
│       │   │   ├── compare/page.tsx
│       │   │   ├── dealers/
│       │   │   │   ├── page.tsx
│       │   │   │   └── [slug]/page.tsx
│       │   │   ├── sitemap.ts
│       │   │   └── robots.ts
│       │   ├── (buyer)/dashboard/...             # Auth: BUYER
│       │   ├── (society)/society-portal/...     # Auth: SOCIETY_ADMIN
│       │   ├── (dealer)/dealer-portal/...        # Auth: DEALER_PARTNER
│       │   ├── (admin)/admin/...                 # Auth: SUPER_ADMIN
│       │   └── api/
│       │       ├── auth/[...all]/route.ts        # Auth.js v5 — exports { GET, POST } from handlers
│       │       ├── trpc/[trpc]/route.ts          # tRPC router (preferred over ad-hoc REST)
│       │       └── webhooks/
│       │           ├── escrow/route.ts
│       │           └── verification/route.ts
│       ├── auth.ts                                # Auth.js v5 config — exports handlers/auth/signIn/signOut
│       ├── middleware.ts                          # RBAC + rate limiting
│       └── next.config.ts                         # Security headers, CSP
│
├── packages/
│   ├── domain/                       # Pure business logic — the crown jewels
│   │   ├── tax/
│   │   ├── allocation/
│   │   ├── balloting/
│   │   ├── escrow/
│   │   ├── trust-score/
│   │   └── ledger/
│   ├── verification/                 # NADRA / FBR / DNFBP / PLRA adapters
│   ├── database/                     # Prisma schema, client, seed
│   ├── types/                        # Zod schemas + inferred TS types (shared contract)
│   ├── ui/                           # Design system (shadcn-based + Tailwind v4 @theme), Storybook
│   ├── api-client/                   # tRPC router definitions + typed client wrapper
│   └── config/                       # eslint-config (flat), tsconfig, shared theme.css
│
├── docs/
│   ├── architecture/                 # ADRs (ADR-001-modular-monolith.md, etc.)
│   ├── api/                          # Generated OpenAPI spec
│   └── runbooks/                     # "How to swap a mock adapter for production"
│
├── turbo.json
├── pnpm-workspace.yaml
└── README.md                         # Architecture overview + setup
```

---

## 3. CORE DOMAIN PACKAGES (build these FIRST, with tests)

Each package below must export pure functions with full TSDoc, a README with usage examples, and a Vitest test suite covering edge cases. **No package in `domain/` may import from Next.js, Prisma, or any framework — they take plain data in and return plain data out.**

### 3.1 `packages/domain/tax`

```typescript
/**
 * Calculates the complete tax and fee breakdown for a property transfer
 * under Pakistani federal tax law (Income Tax Ordinance 2001, as amended).
 *
 * @see Section 236C — Advance tax on sale/transfer of immovable property
 * @see Section 236K — Advance tax on purchase of immovable property
 * @see Section 7E   — Tax on deemed income from immovable property
 *
 * Rates are sourced from {@link TaxRateTable}, which is versioned by
 * fiscal year so rate changes never require a code change — only a
 * new entry in the rate table config.
 */
export function calculateTransferTax(
  input: TaxCalculationInput,
  rates: TaxRateTable = CURRENT_FISCAL_YEAR_RATES
): TaxBreakdown
```

- `TaxCalculationInput`: `{ salePrice, fbrTableValue, sellerAtlStatus, buyerAtlStatus, plotType }`
- `TaxBreakdown`: `{ section236C, section236K, section7E, stampDuty, regulatoryFee, total, breakdown: LineItem[] }`
- `TaxRateTable`: versioned config object — `{ fiscalYear, section236C: {...}, section236K: {...}, stampDuty: {...}, section7eThreshold, section7eRate }`
- Test cases must cover: exactly-at-threshold for Section 7E, all 9 combinations of seller/buyer ATL status, sale price below FBR table value (taxes computed on FBR value), zero/negative inputs (should throw with descriptive errors)

### 3.2 `packages/domain/allocation`

```typescript
/**
 * Allocates an available plot from an InventoryCategory to a booking.
 *
 * Strategy is determined by the category's `allocationStrategy` field:
 * - `FIFO`: first booking with a confirmed escrow token gets the next
 *   available plot in ascending serial order.
 * - `BALLOT`: booking enters a pending pool; allocation happens only
 *   when {@link runBallot} executes for that category's active ballot event.
 */
export function allocatePlot(
  category: InventoryCategorySnapshot,
  booking: BookingSnapshot
): AllocationResult
```

### 3.3 `packages/domain/balloting`

```typescript
/**
 * Runs a cryptographically-seeded, deterministic, auditable balloting
 * round. Given the same `entries` and `seed`, always produces the same
 * result — this determinism is the basis of the immutable audit log
 * and allows third-party verification of fairness.
 */
export function runBallot(
  entries: BallotEntry[],
  availablePlots: PlotSlot[],
  seed: string
): BallotResult
```

- `BallotResult` includes the seed, a SHA-256 hash of the full input set, the resulting assignments, and a human-readable "verification statement" suitable for inclusion in a PDF.

### 3.4 `packages/domain/escrow`

A typed state machine:

```
BOOKING_TOKEN_PAID → ALLOCATED → INSTALLMENT_DUE → INSTALLMENT_PAID (repeats)
  → FULLY_PAID → DOCUMENTS_ISSUED → COMMISSION_RELEASED
```

```typescript
/**
 * Validates and applies a state transition for an escrow-backed booking.
 * Throws {@link InvalidEscrowTransitionError} if the transition is not
 * legal from the current state. Every successful transition produces
 * an {@link EscrowEvent} for the audit ledger — this function does not
 * write to a database, it returns the event for the caller to persist.
 */
export function transitionEscrowState(
  current: EscrowState,
  action: EscrowAction
): { nextState: EscrowState; event: EscrowEvent }
```

### 3.5 `packages/domain/trust-score`

```typescript
/**
 * Computes a 0-100 trust score for a dealer or society profile.
 *
 * Weighting (documented and configurable via {@link TrustScoreWeights}):
 * - 50%: verified completed transactions (via PLRA-reported transfers)
 * - 20%: average buyer rating (only from post-visit/post-transaction reviews)
 * - 15%: response time percentile
 * - 10%: profile/license verification completeness (DNFBP, LOP, NOC)
 * - 5%:  dispute resolution history (penalized for unresolved disputes)
 *
 * Verified-transaction weighting deliberately dominates so the score
 * cannot be gamed through engagement alone.
 */
export function calculateTrustScore(
  inputs: TrustScoreInputs,
  weights: TrustScoreWeights = DEFAULT_WEIGHTS
): TrustScoreResult
```

### 3.6 `packages/domain/ledger`

```typescript
/**
 * Append-only audit event builder. Every domain package that produces
 * a state change (escrow, allocation, balloting, document issuance)
 * returns events conforming to {@link LedgerEvent}. The database layer
 * is responsible for persisting these as INSERT-only rows — UPDATE or
 * DELETE on the ledger table is forbidden at the schema level (enforce
 * via a Postgres trigger, documented in ADR-004).
 */
export function createLedgerEvent(
  type: LedgerEventType,
  entityId: string,
  payload: Record<string, unknown>,
  actor: ActorRef
): LedgerEvent
```

---

## 4. VERIFICATION PACKAGE — `packages/verification`

Adapter pattern. Each government integration gets:
- An interface (`NadraVerificationAdapter`, `FbrAtlAdapter`, `DnfbpVerificationAdapter`, `PlraCertificateAdapter`)
- A `Mock*Adapter` implementation returning realistic Pakistani demo data with simulated latency
- A factory (`createVerificationAdapters(config)`) that returns mocks in development and real implementations when API credentials are present in env vars

```typescript
export interface NadraVerificationAdapter {
  /** Verifies a CNIC and returns identity details + biometric confidence score. */
  verifyCnic(cnic: string): Promise<NadraVerificationResult>;
}

export interface FbrAtlAdapter {
  /** Returns current Active Taxpayer List status for a CNIC/NTN. */
  getAtlStatus(cnic: string, ntn?: string): Promise<AtlStatusResult>;
}

export interface DnfbpVerificationAdapter {
  /** Spot-checks a dealer's DNFBP certificate number. */
  verifyDnfbpCertificate(certNumber: string): Promise<DnfbpVerificationResult>;
}

export interface PlraCertificateAdapter {
  /** Generates a PLRA property certificate for a completed transfer. */
  issueCertificate(transferId: string, payload: TransferPayload): Promise<PlraCertificate>;
}
```

Write `docs/runbooks/swapping-verification-adapters.md` explaining exactly which env vars to set and what the production adapter's contract must satisfy.

---

## 5. DATABASE SCHEMA — `packages/database/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── IDENTITY & ACCESS ─────────────────────────────────────────────

enum UserRole {
  SUPER_ADMIN
  SOCIETY_ADMIN
  DEALER_PARTNER
  BUYER
}

model User {
  id              String    @id @default(cuid())
  email           String?   @unique
  phone           String    @unique
  cnicEncrypted   String?   // field-level encrypted, see ADR-005
  ntnEncrypted    String?
  name            String
  role            UserRole  @default(BUYER)
  atlStatus       AtlStatus @default(NON_FILER)
  atlVerifiedAt   DateTime?
  nadraVerified   Boolean   @default(false)
  trustScore      Float?    @default(0)
  createdAt       DateTime  @default(now())

  // Relations
  societyId       String?
  society         Society?  @relation(fields: [societyId], references: [id])
  bookings        Booking[]
  dealerProfile   DealerProfile?
  reviewsGiven    Review[]  @relation("ReviewAuthor")
  reviewsReceived Review[]  @relation("ReviewSubject")
}

enum AtlStatus {
  FILER
  LATE_FILER
  NON_FILER
}

// ── SOCIETY & INVENTORY ───────────────────────────────────────────

model Society {
  id                String   @id @default(cuid())
  slug              String   @unique          // for SEO-friendly URLs
  name              String
  city              String
  citySlug          String
  authority         String   // CDA, LDA, RDA, etc.
  lopReferenceNo    String?
  nocReferenceNo    String?
  hsmsLinked        Boolean  @default(false)
  verificationTier  VerificationTier @default(PENDING)
  description       String   @db.Text
  amenities         String[]
  latitude          Float?
  longitude         Float?
  developmentStage  String   // e.g. "Under Development", "Possession Underway"
  developmentPct    Int      @default(0)
  heroImageUrl      String?
  createdAt         DateTime @default(now())

  categories        InventoryCategory[]
  partnerAuthorizations SocietyPartnerAuthorization[]
  users             User[]
  reviews           Review[] @relation("ReviewSubjectSociety")

  @@index([citySlug])
}

enum VerificationTier {
  PENDING
  VERIFIED      // LOP + NOC confirmed
  HSMS_LINKED   // + live HSMS integration
}

model InventoryCategory {
  id                  String   @id @default(cuid())
  societyId           String
  society             Society  @relation(fields: [societyId], references: [id])
  slug                String   // SEO-friendly, e.g. "phase-2-block-c-5-marla-residential"
  phase               String
  block               String
  plotType            PlotType
  sizeLabel           String   // "5 Marla", "10 Marla", "1 Kanal", "4 Marla Commercial"
  sizeSqft            Int
  pricePerSqft        Decimal
  totalUnits          Int
  availableUnits      Int
  allocationStrategy  AllocationStrategy @default(FIFO)
  fbrValuationZone    String

  paymentPlans        PaymentPlan[]
  plots               Plot[]
  bookings            Booking[]

  @@unique([societyId, slug])
  @@index([societyId])
}

enum PlotType {
  RESIDENTIAL
  COMMERCIAL
}

enum AllocationStrategy {
  FIFO
  BALLOT
}

model PaymentPlan {
  id                  String   @id @default(cuid())
  categoryId          String
  category            InventoryCategory @relation(fields: [categoryId], references: [id])
  label               String   // "Lump Sum (5% discount)", "3-Year Installments"
  downPaymentPct      Decimal
  installmentCount    Int
  installmentInterval String   // "monthly", "quarterly"
}

model Plot {
  id          String   @id @default(cuid())
  categoryId  String
  category    InventoryCategory @relation(fields: [categoryId], references: [id])
  serialNo    String   @unique
  plotNo      String?
  status      PlotStatus @default(AVAILABLE)
  bookingId   String?  @unique
  booking     Booking? @relation(fields: [bookingId], references: [id])
}

enum PlotStatus {
  AVAILABLE
  RESERVED
  ALLOCATED
  TRANSFERRED
}

// ── BOOKINGS & ESCROW ──────────────────────────────────────────────

model Booking {
  id              String   @id @default(cuid())
  buyerId         String
  buyer           User     @relation(fields: [buyerId], references: [id])
  categoryId      String
  category        InventoryCategory @relation(fields: [categoryId], references: [id])
  paymentPlanId   String
  dealerId        String?
  dealer          DealerProfile? @relation(fields: [dealerId], references: [id])

  status          EscrowState @default(BOOKING_TOKEN_PAID)
  taxBreakdown    Json        // snapshot from domain/tax at booking time
  allocatedPlot   Plot?

  createdAt       DateTime @default(now())
  events          LedgerEvent[]

  @@index([categoryId])
  @@index([buyerId])
}

enum EscrowState {
  BOOKING_TOKEN_PAID
  ALLOCATED
  INSTALLMENT_DUE
  INSTALLMENT_PAID
  FULLY_PAID
  DOCUMENTS_ISSUED
  COMMISSION_RELEASED
  CANCELLED
}

// ── DEALERS / PARTNERS ─────────────────────────────────────────────

model DealerProfile {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id])
  slug              String   @unique
  agencyName        String
  dnfbpCertNumber   String?
  dnfbpVerified     Boolean  @default(false)
  completedDeals    Int      @default(0)

  authorizations    SocietyPartnerAuthorization[]
  bookings          Booking[]
}

model SocietyPartnerAuthorization {
  id          String   @id @default(cuid())
  societyId   String
  society     Society  @relation(fields: [societyId], references: [id])
  dealerId    String
  dealer      DealerProfile @relation(fields: [dealerId], references: [id])
  categoryId  String?  // null = authorized for all categories
  commissionSplitPct Decimal
  status      AuthorizationStatus @default(ACTIVE)

  @@unique([societyId, dealerId, categoryId])
}

enum AuthorizationStatus {
  ACTIVE
  REVOKED
}

// ── REVIEWS ─────────────────────────────────────────────────────────

model Review {
  id              String   @id @default(cuid())
  authorId        String
  author          User     @relation("ReviewAuthor", fields: [authorId], references: [id])
  subjectUserId   String?
  subjectUser     User?    @relation("ReviewSubject", fields: [subjectUserId], references: [id])
  subjectSocietyId String?
  subjectSociety  Society? @relation("ReviewSubjectSociety", fields: [subjectSocietyId], references: [id])
  bookingId       String   // reviews ONLY allowed against a real booking
  rating          Int      // 1-5
  comment         String?  @db.Text
  createdAt       DateTime @default(now())
}

// ── AUDIT LEDGER (append-only — enforce via DB trigger, ADR-004) ────

model LedgerEvent {
  id          String   @id @default(cuid())
  type        String
  entityId    String
  bookingId   String?
  booking     Booking? @relation(fields: [bookingId], references: [id])
  payload     Json
  actorId     String?
  actorRole   String?
  createdAt   DateTime @default(now())

  @@index([entityId])
  @@index([bookingId])
}
```

---

## 6. PUBLIC MARKETPLACE — SEO ARCHITECTURE (WORLD-CLASS)

This is a core differentiator — "compare housing societies in [city]" must rank.

### 6.1 Rendering Strategy
- `/societies` — SSR with search params for filters (city, price range, plot type, authority), so filtered URLs are crawlable and shareable
- `/societies/[city]/[society]` — **ISR** (revalidate every 6 hours), since inventory counts change but content is largely stable
- `/compare?ids=a,b,c` — SSR, with canonical tag pointing to itself (comparison combinations are legitimate unique pages, not duplicate content)

### 6.2 Structured Data (JSON-LD)
Every society page emits:
- `Organization` schema for the society itself
- `RealEstateListing` schema per inventory category, with `priceRange`, `availability`
- `AggregateRating` from the Review model
- `BreadcrumbList` (Home → Societies → City → Society)

Implement a shared `packages/ui/seo/JsonLd.tsx` component that takes a typed schema object (Zod-validated against schema.org shapes) and renders the `<script type="application/ld+json">` tag — reusable across all entity types.

### 6.3 Dynamic Sitemaps
`app/(marketplace)/sitemap.ts` queries all `Society` and `InventoryCategory` records and generates a complete sitemap with `lastModified` from `updatedAt`. For societies count beyond ~50,000 URLs, split into `sitemap-societies-[n].xml` per Next.js sitemap index conventions — document this scaling step in ADR-006 even if not needed at launch.

### 6.4 Dynamic OG Images
`opengraph-image.tsx` per society page generates a branded card (society name, city, "Verified" badge, starting price) using `next/og` — so every shared link looks professional on WhatsApp/Facebook, which is how Pakistani users primarily share listings.

### 6.5 Core Web Vitals
- All images via `next/image` with explicit dimensions
- Font loading via `next/font` (no FOUT/FOIT)
- Comparison tool client component is dynamically imported (`next/dynamic`) to keep the initial society page bundle lean

---

## 7. SECURITY ARCHITECTURE

| Layer | Implementation |
|---|---|
| Authentication | Auth.js v5 (`auth.ts` config), credential + OTP-based (phone-first, matching Pakistani user expectations) |
| Authorization | `middleware.ts` checks route group against `session.user.role`; domain packages never trust role claims passed from the client — always re-derive from session server-side |
| Input validation | Every tRPC procedure has a Zod input schema (shared from `packages/types`); reject before touching the database |
| Sensitive data | CNIC/NTN stored via field-level encryption (`packages/database/encryption.ts`, AES-256-GCM, key from env/KMS) — document key rotation in ADR-005 |
| Rate limiting | `@upstash/ratelimit` on auth, booking, and verification-triggering endpoints |
| Audit trail | Every mutation in booking/escrow/allocation domains produces a `LedgerEvent`; enforce INSERT-only via Postgres trigger |
| Headers | `next.config.ts` sets CSP, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy` |
| Secrets | `.env` validated at boot via a Zod schema in `packages/config/env.ts` — app fails fast on missing/malformed secrets, never silently runs with undefined values |

---

## 8. DOCUMENTATION STANDARDS

- **Root `README.md`**: architecture diagram (ASCII or Mermaid), local setup (`pnpm install && pnpm dev`), monorepo map
- **`docs/architecture/ADR-XXX-*.md`**: one file per significant decision (modular monolith vs microservices, Prisma vs Drizzle, encryption approach, ledger immutability enforcement, sitemap scaling, mock-to-production adapter strategy)
- **Per-package `README.md`** in every `packages/*`: what it does, how to import it, a runnable usage example
- **TSDoc on every exported function** in `domain/` and `verification/` — include `@see` references to legal sections where relevant (as shown in Section 3 examples above)
- **Storybook** for `packages/ui` — every component gets a story with controls for its props
- **OpenAPI**: tRPC v11 procedures get OpenAPI metadata via `trpc-to-openapi` (the actively maintained successor to the older `trpc-openapi` package — verify current package name/version at install time, as tRPC tooling here moves quickly), output to `docs/api/openapi.json`, served at `/api/docs` in non-production environments. Note this is only needed for any REST-consuming third party (e.g. a future mobile app written outside the monorepo); internal web-app calls should use the native tRPC client, not the REST shim.

---

## 9. TESTING STRATEGY

- **`packages/domain/*`**: Vitest, target ~100% branch coverage on `tax` and `escrow` (these encode legal/financial correctness — bugs here are compliance risks, not just UX bugs)
- **`packages/verification`**: test mock adapters return schema-valid responses; test the factory correctly switches based on env config
- **E2E (Playwright)**: cover the critical path — browse societies → compare → select category → mock NADRA/FBR verification → pay booking token → see allocation result
- **CI**: `turbo run test lint typecheck` on every PR via GitHub Actions (`.github/workflows/ci.yml`)

---

## 10. SEED DATA (`packages/database/seed.ts`)

Generate realistic Pakistani demo data:
- 5 societies across Lahore, Islamabad, Karachi — varied verification tiers, development stages
- 4-6 inventory categories per society (mix of residential 3/5/10 Marla, 1 Kanal, and commercial)
- 2-3 payment plans per category
- 8-10 dealer profiles with DNFBP numbers (some verified, some pending)
- 15-20 buyer users with varied ATL statuses
- A handful of completed bookings in different escrow states, generating realistic ledger events
- Reviews only attached to completed bookings

---

## 11. PINNED DEPENDENCY BASELINE — INSTALL THESE EXACT MAJOR/MINOR VERSIONS

Package ecosystems move fast, and an AI coding agent left to pick "latest" can silently mix incompatible majors (e.g. a v4 Tailwind plugin with a v3-only config shape, or an Auth.js v4 adapter against a v5 core). To remove that risk entirely, scaffold against this baseline, then let Cursor bump patch versions only as needed:

```jsonc
// Core
"next": "^16.2.0",
"react": "^19.0.0",
"react-dom": "^19.0.0",
"typescript": "^5.7.0",

// API & validation
"@trpc/server": "^11.0.0",
"@trpc/client": "^11.0.0",
"@trpc/react-query": "^11.0.0",
"@tanstack/react-query": "^5.60.0",
"zod": "^3.24.0",

// Database
"prisma": "^6.0.0",
"@prisma/client": "^6.0.0",

// Auth
"next-auth": "5.0.0-beta.25",        // Auth.js v5 — still ships under the next-auth package name on npm
"@auth/prisma-adapter": "^2.7.0",

// Styling
"tailwindcss": "^4.0.0",
"@tailwindcss/postcss": "^4.0.0",

// State & jobs
"zustand": "^5.0.0",
"bullmq": "^5.30.0",
"ioredis": "^5.4.0",

// Tooling
"turbo": "^2.3.0",
"eslint": "^9.15.0",
"vitest": "^2.1.0",
"@playwright/test": "^1.49.0"
```

**Before running `pnpm install`, ask Cursor to run `npm view <package> versions --json` (or check npmjs.com) for `next-auth`, `@trpc/server`, and `tailwindcss` specifically** — these three have the highest churn of anything in this stack and the exact current version string should be confirmed at build time rather than trusted from this document, since it was written June 2026 and these ecosystems ship frequently. Pin exact versions in a single root `package.json` "catalog" (pnpm workspace catalogs, supported in pnpm 9.5+) so every package in the monorepo resolves to the identical version — this is what actually prevents the "works in one package, breaks in another" class of bug in a monorepo.

---

## 12. IMPLEMENTATION ORDER

1. **Monorepo skeleton** — Turborepo, pnpm workspaces with a version catalog (Section 11), `packages/config` (eslint flat config/tsconfig/shared theme.css presets)
2. **`packages/types`** — Zod schemas for every domain entity (single source of truth, imported everywhere)
3. **`packages/domain/*`** — tax, allocation, balloting, escrow, trust-score, ledger — each with tests passing before moving on
4. **`packages/verification`** — adapters + mocks
5. **`packages/database`** — Prisma schema, migrations, seed script
6. **`packages/ui`** — design system primitives (Tailwind v4 `@theme`) + Storybook
7. **`packages/api-client`** — tRPC router definitions wired to domain packages, exported typed hooks
8. **`apps/web` — public marketplace** — homepage, society directory, society profile (with SEO architecture from Section 6), compare tool
9. **`apps/web` — buyer dashboard** — booking flow wired to domain packages via tRPC
10. **`apps/web` — society portal** — category/pricing management, partner authorization, booking queue
11. **`apps/web` — dealer portal** — DNFBP verification flow, lead pipeline, trust score view
12. **`apps/web` — admin** — verification queue, ledger viewer, revenue dashboard
13. **Security hardening pass** — headers, rate limiting, encryption, audit trigger
14. **Documentation pass** — ADRs, READMEs, Storybook, OpenAPI generation
15. **E2E test suite** — Playwright critical paths

---

## 13. `.cursorrules`

```
# Sectoria.pk — Cursor Rules

## Dependency Discipline
- NEVER install a package without checking it against the pinned baseline in docs (Section 11 of the build spec). If a needed package isn't listed, check its npm page for the latest stable major before adding it — do not guess a version number.
- All packages in the monorepo must resolve to the SAME version of shared deps (zod, typescript, react) via the pnpm catalog. Never let one package drift to a different version of a workspace-wide dependency.
- Next.js `params` and `searchParams` are always Promises — always `await` them, never access synchronously.
- Auth.js v5 config lives in a single auth.ts exporting handlers/auth/signIn/signOut — do not recreate the old v4 [...nextauth] options-object pattern.

## Architecture
- packages/domain/* must NEVER import from Next.js, Prisma, or React. Pure TS only.
- Every exported function in packages/domain and packages/verification requires a TSDoc comment.
- All tRPC procedure inputs validated with Zod schemas from packages/types — no inline ad-hoc validation, no duplicated schema definitions.
- LedgerEvent rows are INSERT-only. Never write UPDATE or DELETE against the LedgerEvent table.
- CNIC and NTN fields are NEVER stored or logged in plaintext — always via packages/database/encryption.

## Code Standards
- TypeScript strict mode. No `any`. No `// @ts-ignore` without a comment explaining why.
- Every new package gets a README.md with at least one usage example before being imported elsewhere.
- Tax calculation logic changes require updating/adding test cases in the same PR.

## SEO
- Every new public route under app/(marketplace)/ must implement generateMetadata.
- Any new entity type that should appear in search results needs a corresponding JSON-LD schema component.

## UI
- All monetary values formatted "PKR X,XXX,XXX"
- Status badges follow the defined color system (green=verified/compliant, amber=pending, red=blocked)
- Every new shared component goes in packages/ui with a Storybook story
- Tailwind v4: design tokens go in the shared @theme block in packages/ui/theme.css — never hardcode hex colors in component files
```

---

## FINAL QUALITY BAR

Before considering any package "done":
- [ ] Has a README with a working usage example
- [ ] Exported functions have TSDoc
- [ ] Has tests covering at least the documented edge cases
- [ ] Zero framework dependencies in `domain/*`
- [ ] No `any`, no unhandled promise rejections
- [ ] All dependencies match the pnpm catalog version — no silent drift to a different major

Before considering any public page "done":
- [ ] `generateMetadata` implemented
- [ ] JSON-LD structured data present and valid (test via Google Rich Results Test)
- [ ] Included in sitemap
- [ ] Lighthouse SEO + Performance score ≥ 90

Start with the monorepo skeleton and `packages/types`, then build outward exactly per the implementation order above.

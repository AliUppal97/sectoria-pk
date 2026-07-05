# Expert Lenses — Sectoria session ship review

Sectoria-specific checks per review lens. Apply only when the session touches that surface.

---

## Correctness & completeness

- Every numbered deliverable in the session **Prompt** has a corresponding diff artifact (file, export, migration, test, page).
- **Test gate** items are evidenced — cite test name, SQL reviewed, or manual check performed.
- Enum values in `packages/types` mirror Prisma **exactly** (`as const` + derived union).
- Additive-only rule respected: no silent column drops/renames unless the session explicitly allows migration cleanup.
- Idempotency where the prompt requires it (import, publish, money-adjacent writes).
- Ledger events use the standard builder — no ad-hoc audit rows when the prompt says otherwise.

---

## Security & access control

Applies to: API sessions (S2, S5 api-client, etc.), auth, storage, admin portals.

- Procedure matches caller identity (`publicProcedure`, `protectedProcedure`, `societyAdminProcedure`, `opsProcedure`, `superAdminProcedure`, `dealerProcedure`).
- Identity re-derived from `ctx.session` — never trust client-supplied role/userId.
- Resource ownership asserted before writes (`assertSocietyOwnership`, category authorization for dealers).
- **Concierge redaction:** no `dealerNetPkr`, `spreadPkr`, `commissionSplitPct`, dealer phone/email in buyer-facing DTOs.
- Private documents/media: no URL returned before auth check (URL minting may defer to storage session — mark DEFER if stubbed per prompt).
- No plaintext PII columns (CNIC/NTN) unless spec explicitly requires and encryption path exists.
- Typed `TRPCError` codes (`NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `BAD_REQUEST`) — no generic throws.
- New mutations appear in `docs/architecture/access-rights-matrix.md`.

---

## Scalability & performance

Applies to: directory/list endpoints, search, sitemap, bulk import, public reads.

- No N+1 or per-row fan-out in list/summary procedures — query-count tests if the gate requires them.
- Cursor pagination on large lists; avoid unbounded `findMany`.
- Filters use indexed columns (`publishStatus`, FK indexes, trigram for name search when specified).
- `groupBy` / `aggregate` for facets and category rollups — not in-memory full-table scans.
- `generateStaticParams` / sitemap capped or filtered per playbook (e.g. top N published societies).
- On-demand revalidation (`revalidatePath` / `revalidateTag`) when publish status or public content changes.

---

## Architecture & maintainability

- Input schemas imported from `@sectoria/types` — no inline Zod in routers.
- One router file per domain area; registered in `root-router.ts`.
- DTO mappers serialize `Date` → ISO string, `Decimal` → string (follow `society-update.router.ts`).
- Multi-write mutations + ledger in a single Prisma `$transaction`.
- Reuse existing helpers before creating new ones (`000-core.mdc`).
- Smallest correct diff — no drive-by refactors unrelated to the session.

---

## Business & product (concierge model)

- Society creation / lifecycle is **ops/platform** work — not buyer self-serve.
- CTAs funnel to quote request — no self-serve booking/checkout on profile work.
- Draft societies excluded from public reads, sitemap, static params unless session says otherwise.
- Publish gated on completeness when M0/S0 requires it.
- Developer/article curation is platform-admin when spec says super-admin-only.
- Trust patterns preserved — no fake urgency, no unverified claims presented as verified.

---

## UI/UX & design system

Applies to: sessions with `apps/web` or `packages/ui` changes (S0 admin console, S4–S10).

- Design tokens from `Sectoria_Design_System.md` — no hardcoded one-off colors/spacing.
- **Five states:** loading, empty, error, success, partial — for data-driven surfaces.
- PKR / CNIC / phone formatting per Sectoria rules.
- Bento grid and trust patterns for profile/marketplace layouts.
- Responsive breakpoints; keyboard/focus for interactive controls.
- Confirm dialogs on destructive actions (archive, unpublish, delete).
- Skip this lens entirely for schema-only, API-only, or SEO-only sessions.

---

## Testing & quality

- `pnpm turbo run test lint typecheck` green (run in Phase 1 — fail fast).
- Tests cover what the **Test gate** lists: authz rejection, happy path, invalid input, idempotency, query-count assertions.
- In-memory test patterns match existing `__tests__` helpers — no live DB in unit tests unless established pattern.
- No tests that only assert mocks returning mocks without behavior.
- Pre-commit hooks would pass — no `eslint-disable` without justification.

---

## Docs & compliance

- `access-rights-matrix.md` updated for every new mutation (required for API sessions).
- Spec/playbook ADR references honored (e.g. ADR-009 for storage — may DEFER to S3).
- Migration SQL inspected when session adds schema — note backfills, indexes, extension enables (`pg_trgm`).
- No secrets, `.env`, or credentials in the diff.

---

## Common deferral map (Society Profile V2)

**Rule:** If a later session's **Prompt or Test Gate** mentions the topic, mark ⏭️
DEFER — never block the current ship. Scan **all** remaining sessions, not just the
next one. See [playbook-sub-session.md](playbook-sub-session.md).

| Topic | Owner session | Ship-review tag |
|---|---|---|
| Presigned upload / storage adapter / ADR-009 | S3 | ⏭️ DEFER |
| Private-doc auth before URL minting / signed URL expiry | S3 Test Gate | ⏭️ DEFER |
| Upload content-type allow-list + size cap | S3 | ⏭️ DEFER |
| CSP img-src / connect-src / frame-src for storage | S3 | ⏭️ DEFER |
| Public profile UI (galleries, docs UI) | S4–S6 | ⏭️ DEFER |
| Developer pages UI | S7 | ⏭️ DEFER |
| Milestone / phase UI | S8 | ⏭️ DEFER |
| Portal editors + cross-society portal checks | S9 | ⏭️ DEFER |
| Blog UI + sanitized markdown | S10 | ⏭️ DEFER |
| Sitemap / JSON-LD / Playwright E2E | S11 | ⏭️ DEFER |
| Stub resolve-storage-url when S2 prompt says "lands in S3" | S3 | ⏭️ DEFER |

### Not deferrable (usually → sub-session)

| Topic | Why |
|---|---|
| `publishStatus = PUBLISHED` on new public API reads | foundations.md §1.1; session that added the reads owns it (S2 → S2a). S11 only covers sitemap. |
| Concierge field redaction on new DTOs | Owning API session |
| access-rights-matrix for new mutations | Owning API session |
| Ownership guards on new mutations | Owning API session |

Always prefer the **playbook prompt text** over this table when they differ.

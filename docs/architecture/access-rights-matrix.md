# Access Rights Matrix

Referenced by `.cursor/rules/auth-and-access-control.mdc`. Update this
table in the same change whenever a new mutation or sensitive query is
added. This is the single source of truth for "who can do what" — if the
code and this table disagree, that's a bug in one of them.

Legend: ✅ allowed · ❌ denied · 🔶 allowed only if resource-owned (see notes)

| Action | BUYER | DEALER_PARTNER | SOCIETY_ADMIN | SALES_ADVISOR | SUPER_ADMIN |
|---|---|---|---|---|---|
| Browse public society directory | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit a public quote request (lead) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View own quote requests (leads) | 🔶 own only | ❌ | ❌ | ❌ | ✅ all |
| View advisor quotes sent to self | 🔶 own only | ❌ | ❌ | ❌ | ✅ all |
| Accept quote / pay token on platform | 🔶 own quotes only | ❌ | ❌ | ❌ | ❌ |
| Pay installment on platform (concierge) | 🔶 own quotes only | ❌ | ❌ | ❌ | ❌ |
| View ops lead pipeline | ❌ | ❌ | ❌ | ✅ | ✅ |
| Assign advisor / update lead status | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create/send advisor quotes | ❌ | ❌ | ❌ | ✅ | ✅ |
| View dealer net price matrix | ❌ | ❌ | ❌ | ✅ | ✅ |
| Upsert dealer net price sheets | ❌ | 🔶 authorized categories only | ❌ | ❌ | ✅ |
| View fulfillment orders (no buyer PII) | ❌ | 🔶 own orders only | ❌ | ✅ | ✅ all |
| Mark fulfillment allocated (plot ref) | ❌ | 🔶 own orders only | ❌ | ❌ | ✅ |
| Record dealer net remittance | ❌ | ❌ | ❌ | ❌ | ✅ |
| View concierge revenue / remittance summary | ❌ | ❌ | ❌ | ❌ | ✅ |
| View own booking history (legacy) | ✅ | ❌ | ❌ | ❌ | ✅ |
| Create a booking (pay token) | ✅ (after NADRA verification) | ❌ | ❌ | ❌ | ❌ |
| Cancel a booking (while refundable) | 🔶 own booking only | ❌ | 🔶 own society's bookings only | ❌ | ✅ |
| Submit a review | ✅ (only post-booking-milestone) | ❌ | ❌ | ❌ | ❌ |
| Trigger NADRA CNIC verification (self) | ✅ self only | ✅ self only | ✅ self only | ✅ self only | ✅ self only |
| Check own FBR ATL status (self) | ✅ self only | ✅ self only | ✅ self only | ✅ self only | ✅ self only |
| View a dealer's public trust score | ✅ | ✅ | ✅ | ✅ | ✅ |
| View own lead pipeline (legacy dealer leads) | ❌ | 🔶 own leads only | ❌ | ❌ | ✅ |
| Register/update DNFBP certificate | ❌ | 🔶 own profile only | ❌ | ❌ | ✅ |
| Update society profile fields | ❌ | ❌ | 🔶 own society only | ❌ | ✅ |
| Create/edit inventory category for a society | ❌ | ❌ | 🔶 own society only | ❌ | ✅ |
| Set pricing/payment plans | ❌ | ❌ | 🔶 own society only | ❌ | ✅ |
| Publish society news/updates (NOC, possession, booking) | ❌ | ❌ | 🔶 own society only | ❌ | ✅ |
| Update society location, land area, booking status | ❌ | ❌ | 🔶 own society only | ❌ | ✅ |
| Authorize a dealer as Sales Partner | ❌ | ❌ | 🔶 own society only | ❌ | ✅ |
| Revoke a dealer's authorization | ❌ | ❌ | 🔶 own society only | ❌ | ✅ |
| Allocate a plot to a token-paid booking | ❌ | ❌ | 🔶 own society's bookings only | ❌ | ✅ |
| Confirm receipt of an installment | ❌ | ❌ | 🔶 own society's bookings only | ❌ | ✅ |
| Issue allotment/PLRA certificate | ❌ | ❌ | 🔶 own society's bookings only | ❌ | ✅ |
| Release escrowed commission | ❌ | ❌ | ❌ (auto on certificate) | ❌ | ✅ (manual override, logged) |
| View ledger / audit trail for an entity | 🔶 own bookings only | 🔶 own bookings only | 🔶 own society's bookings only | 🔶 ops entities | ✅ all |
| Moderate/flag a listing or profile | ❌ | ❌ | ❌ | ❌ | ✅ |
| Resolve a dispute | ❌ | ❌ | ❌ | ❌ | ✅ |
| Modify tax rate table / fiscal year config | ❌ | ❌ | ❌ | ❌ | ✅ |
| View revenue dashboard | ❌ | 🔶 own commission only | 🔶 own society only | ❌ | ✅ all |
| View society portal dashboard (compliance, HSMS, booking metrics) | ❌ | ❌ | 🔶 own society only | ❌ | ✅ all |
| Update LOP/NOC references and HSMS link status | ❌ | ❌ | 🔶 own society only | ❌ | ✅ |
| View booking confirmation queue (awaiting society action) | ❌ | ❌ | 🔶 own society's bookings only | ❌ | ✅ all |
| List partner authorizations for a society | ❌ | ❌ | 🔶 own society only | ❌ | ✅ all |
| View dealer portal dashboard (metrics, authorized societies) | ❌ | 🔶 own profile only | ❌ | ❌ | ✅ all |
| View own trust score breakdown | ❌ | 🔶 own profile only | ❌ | ❌ | ✅ all |
| View admin dashboard overview | ❌ | ❌ | ❌ | ❌ | ✅ |
| View verification queue (pending societies/dealers) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve/reject society verification tier (with reason) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve/reject dealer DNFBP verification (with reason) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Search/filter full platform ledger | ❌ | ❌ | ❌ | ❌ | ✅ |
| Flag a plot as disputed (with reason) | ❌ | ❌ | ❌ | ❌ | ✅ |
| View booking funnel by escrow state | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create a society (onboarding; starts DRAFT) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Publish / unpublish / archive a society (publish gated on completeness) | ❌ | ❌ | ❌ | ✅ | ✅ |
| View onboarding console (all statuses incl. DRAFT/ARCHIVED) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Assign / unassign a society administrator | ❌ | ❌ | ❌ | ❌ | ✅ |
| Bulk-import societies (idempotent upsert, dry-run) | ❌ | ❌ | ❌ | ❌ | ✅ |

## Notes

- 🔶 "resource-owned" rows must be enforced at the procedure level, not
  just the route-group level — see `auth-and-access-control.mdc`'s
  "role + resource ownership" rule.
- `SUPER_ADMIN` manual overrides (e.g., manually releasing escrow) must
  always produce a `LedgerEvent` tagged with the admin's identity and a
  reason — never a silent override.
- When adding a new row: name the action precisely (verb + resource),
  fill in all five role columns explicitly (don't leave a cell blank/assumed),
  and note in this file if the enforcement point is route-group
  middleware, procedure-level guard, or both.
- Session 8–10 portal actions (society/dealer/admin dashboards, verification
  queue, ledger search, plot disputes) are enforced in `packages/api-client`
  via `societyAdminProcedure`, `dealerProcedure`, and `superAdminProcedure`
  plus resource-ownership asserts — route-group middleware alone is not sufficient.
- M0 society lifecycle: `society.create`, `society.setPublishStatus`, and the
  onboarding console reads (`society.listForAdmin`/`getForAdmin`) use
  `opsProcedure` (SALES_ADVISOR + SUPER_ADMIN); `society.assignAdmin` and
  `society.importBatch` use `superAdminProcedure`. Society creation is
  ops/platform work — never self-service, never a buyer path. Publishing is
  additionally gated on `calculateSocietyCompleteness`, and create/publish/
  archive emit `SOCIETY_CREATED`/`SOCIETY_PUBLISHED`/`SOCIETY_ARCHIVED` ledger
  events via the standard builder. Once an admin is linked, society-portal
  writes stay gated by `assertSocietyOwnership`.

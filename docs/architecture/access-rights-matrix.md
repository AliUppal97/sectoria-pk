# Access Rights Matrix

Referenced by `.cursor/rules/auth-and-access-control.mdc`. Update this
table in the same change whenever a new mutation or sensitive query is
added. This is the single source of truth for "who can do what" — if the
code and this table disagree, that's a bug in one of them.

Legend: ✅ allowed · ❌ denied · 🔶 allowed only if resource-owned (see notes)

| Action | BUYER | DEALER_PARTNER | SOCIETY_ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| Browse public society directory | ✅ | ✅ | ✅ | ✅ |
| View own booking history | ✅ | ❌ | ❌ | ✅ |
| Create a booking (pay token) | ✅ (after NADRA verification) | ❌ | ❌ | ❌ |
| Cancel a booking (while refundable) | 🔶 own booking only | ❌ | 🔶 own society's bookings only | ✅ |
| Submit a review | ✅ (only post-booking-milestone) | ❌ | ❌ | ❌ |
| Trigger NADRA CNIC verification (self) | ✅ self only | ✅ self only | ✅ self only | ✅ self only |
| Check own FBR ATL status (self) | ✅ self only | ✅ self only | ✅ self only | ✅ self only |
| View a dealer's public trust score | ✅ | ✅ | ✅ | ✅ |
| View own lead pipeline | ❌ | 🔶 own leads only | ❌ | ✅ |
| Register/update DNFBP certificate | ❌ | 🔶 own profile only | ❌ | ✅ |
| Update society profile fields | ❌ | ❌ | 🔶 own society only | ✅ |
| Create/edit inventory category for a society | ❌ | ❌ | 🔶 own society only | ✅ |
| Set pricing/payment plans | ❌ | ❌ | 🔶 own society only | ✅ |
| Authorize a dealer as Sales Partner | ❌ | ❌ | 🔶 own society only | ✅ |
| Revoke a dealer's authorization | ❌ | ❌ | 🔶 own society only | ✅ |
| Allocate a plot to a token-paid booking | ❌ | ❌ | 🔶 own society's bookings only | ✅ |
| Confirm receipt of an installment | ❌ | ❌ | 🔶 own society's bookings only | ✅ |
| Issue allotment/PLRA certificate | ❌ | ❌ | 🔶 own society's bookings only | ✅ |
| Release escrowed commission | ❌ | ❌ | ❌ (triggered automatically on certificate issuance) | ✅ (manual override, logged) |
| View ledger / audit trail for an entity | 🔶 own bookings only | 🔶 own bookings only | 🔶 own society's bookings only | ✅ all |
| Moderate/flag a listing or profile | ❌ | ❌ | ❌ | ✅ |
| Resolve a dispute | ❌ | ❌ | ❌ | ✅ |
| Modify tax rate table / fiscal year config | ❌ | ❌ | ❌ | ✅ |
| View revenue dashboard | ❌ | 🔶 own commission only | 🔶 own society only | ✅ all |

## Notes

- 🔶 "resource-owned" rows must be enforced at the procedure level, not
  just the route-group level — see `auth-and-access-control.mdc`'s
  "role + resource ownership" rule.
- `SUPER_ADMIN` manual overrides (e.g., manually releasing escrow) must
  always produce a `LedgerEvent` tagged with the admin's identity and a
  reason — never a silent override.
- When adding a new row: name the action precisely (verb + resource),
  fill in all four columns explicitly (don't leave a cell blank/assumed),
  and note in this file if the enforcement point is route-group
  middleware, procedure-level guard, or both.

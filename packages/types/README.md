# @sectoria/types

The shared **data contract** for the entire Sectoria monorepo: Zod schemas
for every domain entity, with their TypeScript types derived via
`z.infer`. This package is the single source of truth — domain packages,
the API layer, forms, and seed data all import from here so a schema
change propagates everywhere with compile errors at every stale call site.

## Design rules

- **One source of truth.** Each shape is defined once as a Zod schema; the
  TS type is `z.infer<typeof schema>`. There are no hand-written
  interfaces that parallel a schema (they would drift out of sync).
- **Enums** use the `as const` object + derived-union pattern (not TS
  `enum`), with a matching `z.nativeEnum` schema. They mirror the Prisma
  enums in `packages/database` exactly.
- **Money is never a float.** Amounts are whole-rupee integers (`PkrAmount`
  — paisa are not used); genuinely fractional values Prisma stores as
  `Decimal` (prices, percentages) are carried as decimal strings
  (`DecimalString`).
- **Dates are ISO 8601 strings** (`IsoDateTime`), never `Date` objects.
- **Sensitive identifiers are branded** (`Cnic`, `Ntn`, `Slug`, `Id`) so a
  raw string can't be passed where a validated value is required.

## Usage

```ts
import {
  societySchema,
  VerificationTier,
  type Society,
} from "@sectoria/types";

// Validate untrusted input at a boundary:
const society: Society = societySchema.parse(rawInput);

// Enum values are available as a typed const object:
if (society.verificationTier === VerificationTier.HSMS_LINKED) {
  // ...
}
```

Parsing a branded scalar yields a branded value:

```ts
import { pkrAmountSchema, type PkrAmount } from "@sectoria/types";

// PKR 1,500,000 (whole rupees)
const bookingToken: PkrAmount = pkrAmountSchema.parse(1_500_000);
```

## Modules

| File                                | Exports                                                        |
| ----------------------------------- | -------------------------------------------------------------- |
| `common.ts`                         | `Id`, `PkrAmount`, `DecimalString`, `Cnic`, `Ntn`, `Slug`, `IsoDateTime`, `ApiError` |
| `user.ts`                           | `User`, `UserRole`, `AtlStatus`                                |
| `society.ts`                        | `Society`, `VerificationTier`                                  |
| `inventory-category.ts`             | `InventoryCategory`, `PlotType`, `AllocationStrategy`          |
| `plot.ts`                           | `Plot`, `PlotStatus`                                           |
| `payment-plan.ts`                   | `PaymentPlan`, `InstallmentInterval`                           |
| `booking.ts`                        | `Booking`                                                      |
| `escrow.ts`                         | `EscrowState`, `EscrowAction`, `EscrowEvent`                   |
| `tax.ts`                            | `TaxCalculationInput`, `TaxBreakdown`, `TaxRateTable`, `LineItem` |
| `dealer-profile.ts`                 | `DealerProfile`                                                |
| `society-partner-authorization.ts` | `SocietyPartnerAuthorization`, `AuthorizationStatus`           |
| `review.ts`                         | `Review`                                                       |
| `ledger-event.ts`                   | `LedgerEvent`, `LedgerEventType`, `ActorRef`                   |
| `verification.ts`                   | `NadraVerificationResult`, `AtlStatusResult`, `DnfbpVerificationResult`, `PlraCertificate` |

All modules are re-exported from `src/index.ts` — always import from the
package root (`@sectoria/types`), never from a deep path.

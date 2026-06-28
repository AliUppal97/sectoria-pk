# @sectoria/domain-tax

The **FBR property-transfer tax engine**. Given a transfer's prices, each
party's ATL (Active Taxpayer List) status, and the plot type, it returns a
fully itemized tax/fee breakdown under Pakistani federal tax law (Income Tax
Ordinance 2001, as amended).

## What it does

- Computes **Section 236C** (advance tax on the seller), **Section 236K**
  (advance tax on the buyer), **Section 7E** (deemed-income tax above a
  threshold), **stamp duty**, and a **regulatory fee** — plus the total and a
  per-charge line-item list suitable for an invoice UI.
- Always taxes `max(salePrice, fbrTableValue)`: a sale price below the FBR
  table value can **never** reduce the tax owed.
- Selects advance-tax rates per party from a **versioned, fiscal-year-keyed
  rate table** — a rate change is a new table entry, never a code edit.

## What it deliberately does NOT do

- **No I/O, no persistence, no framework code.** It does not read the FBR
  valuation tables, fetch ATL status, write a ledger event, or touch a
  database — it takes plain data in and returns plain data out. Pure functions
  only; no imports from Next.js, Prisma, or React. Persistence and lookups are
  the caller's job (see `packages/api-client`).
- **No display formatting of money.** Amounts are whole-rupee integers; format
  to "PKR X,XXX,XXX" at the UI boundary.

## Usage

```ts
import {
  calculateTransferTax,
  CURRENT_FISCAL_YEAR_RATES,
} from "@sectoria/domain-tax";
import { taxCalculationInputSchema, AtlStatus, PlotType } from "@sectoria/types";

// Amounts are whole rupees: PKR 30,000,000.
const input = taxCalculationInputSchema.parse({
  salePrice: 30_000_000,
  fbrTableValue: 32_000_000, // higher → this is what gets taxed
  sellerAtlStatus: AtlStatus.FILER,
  buyerAtlStatus: AtlStatus.NON_FILER,
  plotType: PlotType.RESIDENTIAL,
});

const breakdown = calculateTransferTax(input);
// → { section236C, section236K, section7E, stampDuty, regulatoryFee, total, breakdown: LineItem[] }

// Re-price a historical transfer against an older fiscal year:
calculateTransferTax(input, CURRENT_FISCAL_YEAR_RATES);
```

Invalid input throws a typed `InvalidTaxInputError` (never a bare `Error`,
never a silent `0`):

```ts
import { calculateTransferTax, InvalidTaxInputError } from "@sectoria/domain-tax";

try {
  calculateTransferTax({ ...input, salePrice: 0 });
} catch (error) {
  if (error instanceof InvalidTaxInputError) {
    // error.field === "salePrice"
  }
}
```

## Rates & fiscal years

Rates live in `src/tax-rate-table.ts`, keyed by fiscal year. The percentages
shipped here are the **FY 2025-26 baseline of this demo build and must be
re-verified against the current Finance Act / FBR valuation notifications
before production use.** Changing any rate or threshold requires a matching
test update in the same PR (see `domain-logic.mdc` and `testing.mdc`).

## Constraints

- **Pure & deterministic** — same input + rate table always yields the same
  breakdown.
- **Money is integer rupees**, never a float. Rate application uses `BigInt`
  arithmetic and rounds half-up to the nearest whole rupee.
- **Section 7E** applies only when the taxable value is **strictly above** the
  configured threshold (PKR 25,000,000); at or below it, the property is exempt.

## Test

```bash
pnpm --filter @sectoria/domain-tax test
```

Coverage includes all nine seller/buyer ATL combinations, the Section 7E
threshold boundary (at/above/below), the below-FBR-value floor, and
zero/negative inputs.

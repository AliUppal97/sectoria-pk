# @sectoria/domain-trust-score

**Dealer/society trust scoring.** Turns a profile's signals into a single
0–100 score with a transparent, per-component breakdown.

## What it does

- `calculateTrustScore(inputs, weights?)` returns a `TrustScoreResult`:
  - `score` — the final 0–100 value (rounded to a whole number).
  - `breakdown` — one line per component (`weight`, normalized `0–1` value,
    and the resulting `contribution`), so the score is explainable in a UI.
- Each input is normalized to a `0–1` factor, multiplied by its weight, and
  summed. With the default weights:

  | Component                  | Weight | Normalized from                              |
  | -------------------------- | -----: | -------------------------------------------- |
  | Verified transactions      |   50%  | PLRA-verified completed transfers (saturates at 25) |
  | Buyer rating               |   20%  | average post-transaction rating, 1–5 → 0–1    |
  | Response time              |   15%  | response-time percentile, 0–100               |
  | Verification completeness  |   10%  | fraction of DNFBP/LOP/NOC verified, 0–1       |
  | Dispute resolution         |    5%  | resolved share of lifetime disputes           |

## The anti-gaming guarantee

Verified completed transactions **must** carry at least 50% of the weight (the
domain rejects any weight set that violates this, or that doesn't sum to 100).
Because a profile with **zero** completed transfers contributes nothing from
that dominant component, its score is mathematically capped at
`100 − verifiedTransactionsWeight` — **≤ 50/100** — no matter how strong every
other signal is. Engagement alone can never buy trust. See `domain-logic.mdc`.

## What it deliberately does NOT do

- **No I/O, no persistence, no framework code.** Plain data in, plain data out
  — no imports from Next.js, Prisma, or React.
- **No silent failures.** Missing/invalid inputs throw
  `InvalidTrustScoreInputError`; a bad weight configuration throws
  `InvalidTrustScoreWeightsError` — never a misleading `0`.

## Usage

```ts
import { calculateTrustScore } from "@sectoria/domain-trust-score";

const result = calculateTrustScore({
  verifiedTransactionCount: 18,
  averageBuyerRating: 4.6,
  responseTimePercentile: 82,
  verificationCompleteness: 1,
  disputes: { resolved: 3, unresolved: 0 },
});
// result.score   → e.g. 88
// result.breakdown → per-component weight / normalizedValue / contribution

// A brand-new, fully-verified dealer with no completed transfers:
const unproven = calculateTrustScore({
  verifiedTransactionCount: 0,
  averageBuyerRating: 5,
  responseTimePercentile: 100,
  verificationCompleteness: 1,
  disputes: { resolved: 0, unresolved: 0 },
});
// unproven.score === 50  → capped, by design
```

Weights are configurable via the optional second argument (defaulting to
`DEFAULT_WEIGHTS`), but must sum to 100 and keep verified transactions at ≥ 50.

## Test

```bash
pnpm --filter @sectoria/domain-trust-score test
```

Coverage includes the exact-100 weight sum, the zero-transaction ≤ 50/100 cap
with all other inputs maxed, normalization edge cases (rating saturation, null
ratings, dispute penalties), and typed errors for null/undefined/invalid inputs
and invalid weight configurations.

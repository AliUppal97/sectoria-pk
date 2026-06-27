import { describe, expect, it } from "vitest";
import {
  TrustScoreComponentKey,
  type TrustScoreInputs,
  type TrustScoreWeights,
} from "@sectoria/types";
import { calculateTrustScore } from "../calculate-trust-score.js";
import {
  DEFAULT_WEIGHTS,
  MIN_VERIFIED_TRANSACTION_WEIGHT,
  TOTAL_WEIGHT,
  VERIFIED_TRANSACTION_SATURATION_COUNT,
} from "../default-weights.js";
import {
  InvalidTrustScoreInputError,
  InvalidTrustScoreWeightsError,
} from "../errors.js";

/** A profile that maxes every input *except* the one under test. */
function maxedInputs(overrides: Partial<TrustScoreInputs> = {}): TrustScoreInputs {
  return {
    verifiedTransactionCount: VERIFIED_TRANSACTION_SATURATION_COUNT,
    averageBuyerRating: 5,
    responseTimePercentile: 100,
    verificationCompleteness: 1,
    disputes: { resolved: 0, unresolved: 0 },
    ...overrides,
  };
}

describe("calculateTrustScore — weighting integrity", () => {
  it("default weights sum to exactly 100", () => {
    const total =
      DEFAULT_WEIGHTS.verifiedTransactions +
      DEFAULT_WEIGHTS.buyerRating +
      DEFAULT_WEIGHTS.responseTime +
      DEFAULT_WEIGHTS.verificationCompleteness +
      DEFAULT_WEIGHTS.disputeResolution;

    expect(total).toBe(100);
    expect(total).toBe(TOTAL_WEIGHT);
  });

  it("verified transactions carry at least half of the total weight", () => {
    expect(DEFAULT_WEIGHTS.verifiedTransactions).toBeGreaterThanOrEqual(
      MIN_VERIFIED_TRANSACTION_WEIGHT,
    );
    expect(MIN_VERIFIED_TRANSACTION_WEIGHT / TOTAL_WEIGHT).toBeGreaterThanOrEqual(0.5);
  });

  it("awards a perfect 100 to a profile that maxes every component", () => {
    const result = calculateTrustScore(maxedInputs());
    expect(result.score).toBe(100);
  });
});

describe("calculateTrustScore — zero-transaction anti-gaming cap", () => {
  it("caps a zero-transaction dealer at 50/100 even with every other input maxed", () => {
    const result = calculateTrustScore(maxedInputs({ verifiedTransactionCount: 0 }));

    expect(result.score).toBeLessThanOrEqual(50);
    // With the default split (50/20/15/10/5), the other four components maxed
    // sum to exactly 50 — the contribution from the dominant component is gone.
    expect(result.score).toBe(50);
  });

  it("keeps the cap no matter how the other inputs are arranged", () => {
    const result = calculateTrustScore({
      verifiedTransactionCount: 0,
      averageBuyerRating: 5,
      responseTimePercentile: 100,
      verificationCompleteness: 1,
      disputes: { resolved: 1000, unresolved: 0 },
    });
    expect(result.score).toBeLessThanOrEqual(50);
  });

  it("contributes zero from the verified-transactions component when count is zero", () => {
    const result = calculateTrustScore(maxedInputs({ verifiedTransactionCount: 0 }));
    const line = result.breakdown.find(
      (b) => b.component === TrustScoreComponentKey.VERIFIED_TRANSACTIONS,
    );
    expect(line?.normalizedValue).toBe(0);
    expect(line?.contribution).toBe(0);
  });
});

describe("calculateTrustScore — normalization", () => {
  it("saturates the verified-transaction component at the saturation count", () => {
    const atSaturation = calculateTrustScore(
      maxedInputs({ verifiedTransactionCount: VERIFIED_TRANSACTION_SATURATION_COUNT }),
    );
    const wellOver = calculateTrustScore(
      maxedInputs({ verifiedTransactionCount: VERIFIED_TRANSACTION_SATURATION_COUNT * 10 }),
    );
    expect(atSaturation.score).toBe(100);
    expect(wellOver.score).toBe(100);
  });

  it("treats a null average rating as no credit rather than a zero-star score", () => {
    const noReviews = calculateTrustScore(maxedInputs({ averageBuyerRating: null }));
    const oneStar = calculateTrustScore(maxedInputs({ averageBuyerRating: 1 }));
    // A 1-star average also normalizes to 0, so both lose the full rating weight.
    expect(noReviews.score).toBe(oneStar.score);
    expect(noReviews.score).toBe(100 - DEFAULT_WEIGHTS.buyerRating);
  });

  it("penalizes unresolved disputes via the resolved share", () => {
    const allUnresolved = calculateTrustScore(
      maxedInputs({ disputes: { resolved: 0, unresolved: 4 } }),
    );
    const halfResolved = calculateTrustScore(
      maxedInputs({ disputes: { resolved: 2, unresolved: 2 } }),
    );
    expect(allUnresolved.score).toBeLessThan(halfResolved.score);
  });

  it("breakdown contributions sum to the (unrounded) score", () => {
    const result = calculateTrustScore(
      maxedInputs({ verifiedTransactionCount: 10, averageBuyerRating: 3.5 }),
    );
    const summed = result.breakdown.reduce((total, b) => total + b.contribution, 0);
    expect(result.score).toBe(Math.round(summed));
  });
});

describe("calculateTrustScore — invalid input throws a typed error", () => {
  it("throws InvalidTrustScoreInputError for null input", () => {
    expect(() =>
      calculateTrustScore(null as unknown as TrustScoreInputs),
    ).toThrow(InvalidTrustScoreInputError);
  });

  it("throws InvalidTrustScoreInputError for undefined input", () => {
    expect(() =>
      calculateTrustScore(undefined as unknown as TrustScoreInputs),
    ).toThrow(InvalidTrustScoreInputError);
  });

  it("throws InvalidTrustScoreInputError for a negative transaction count", () => {
    expect(() =>
      calculateTrustScore(maxedInputs({ verifiedTransactionCount: -1 })),
    ).toThrow(InvalidTrustScoreInputError);
  });

  it("throws InvalidTrustScoreInputError for a rating outside the 1–5 range", () => {
    expect(() =>
      calculateTrustScore(maxedInputs({ averageBuyerRating: 9 })),
    ).toThrow(InvalidTrustScoreInputError);
  });
});

describe("calculateTrustScore — invalid weights throw a typed error", () => {
  it("throws InvalidTrustScoreWeightsError when weights do not sum to 100", () => {
    const weights: TrustScoreWeights = {
      ...DEFAULT_WEIGHTS,
      disputeResolution: 99,
    };
    expect(() => calculateTrustScore(maxedInputs(), weights)).toThrow(
      InvalidTrustScoreWeightsError,
    );
  });

  it("throws InvalidTrustScoreWeightsError when verified transactions fall below the floor", () => {
    // Sums to 100 but starves the dominant component — must be rejected.
    const weights: TrustScoreWeights = {
      verifiedTransactions: 40,
      buyerRating: 30,
      responseTime: 15,
      verificationCompleteness: 10,
      disputeResolution: 5,
    };
    expect(() => calculateTrustScore(maxedInputs(), weights)).toThrow(
      InvalidTrustScoreWeightsError,
    );
  });
});

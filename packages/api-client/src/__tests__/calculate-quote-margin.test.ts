import { describe, expect, it } from "vitest";
import { pkrAmountSchema } from "@sectoria/types";
import { calculateQuoteMargin } from "../lib/calculate-quote-margin.js";

const pkr = (amount: number) => pkrAmountSchema.parse(amount);

describe("calculateQuoteMargin", () => {
  it("returns spread as quoted minus dealer net", () => {
    const result = calculateQuoteMargin({
      dealerNetPkr: pkr(13_650_000),
      quotedPricePkr: pkr(13_900_000),
    });
    expect(result.spreadPkr).toBe(250_000);
  });

  it("throws when quoted price is below dealer net", () => {
    expect(() =>
      calculateQuoteMargin({
        dealerNetPkr: pkr(14_000_000),
        quotedPricePkr: pkr(13_000_000),
      }),
    ).toThrow(/below dealer net/i);
  });
});

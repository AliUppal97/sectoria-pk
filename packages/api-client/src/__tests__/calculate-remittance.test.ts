import { describe, expect, it } from "vitest";
import { pkrAmountSchema } from "@sectoria/types";
import { calculateQuoteMargin } from "../lib/calculate-quote-margin.js";

const pkr = (amount: number) => pkrAmountSchema.parse(amount);

describe("remittance calculation", () => {
  it("platform spread equals quoted price minus dealer net", () => {
    const dealerNetPkr = pkr(9_600_000);
    const quotedPricePkr = pkr(9_800_000);
    const { spreadPkr } = calculateQuoteMargin({ dealerNetPkr, quotedPricePkr });

    expect(spreadPkr).toBe(200_000);
    expect(dealerNetPkr + spreadPkr).toBe(quotedPricePkr);
  });

  it("rejects quotes below dealer net", () => {
    expect(() =>
      calculateQuoteMargin({ dealerNetPkr: pkr(10_000_000), quotedPricePkr: pkr(9_000_000) }),
    ).toThrow(/below dealer net/i);
  });
});

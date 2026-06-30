import type { Booking } from "@sectoria/types";

/** Computes the list-price sale amount from category pricing fields. */
export function listPriceFromCategory(category: {
  pricePerSqft: string;
  sizeSqft: number;
}): number {
  return Math.round(Number(category.pricePerSqft) * category.sizeSqft);
}

/** Booking-token amount from sale price and the plan's down-payment percentage. */
export function bookingTokenAmount(
  salePrice: number,
  downPaymentPct: string,
): number {
  return Math.round((salePrice * Number(downPaymentPct)) / 100);
}

/**
 * The PKR amount a society admin confirms for the booking's current escrow step.
 * Uses list price as the agreed sale price proxy (the buyer wizard defaults to this).
 */
export function confirmableAmountPkr(
  booking: Booking,
  category: { pricePerSqft: string; sizeSqft: number },
  plan: { downPaymentPct: string; installmentCount: number },
): number {
  const salePrice = listPriceFromCategory(category);

  switch (booking.status) {
    case "BOOKING_TOKEN_PAID":
      return bookingTokenAmount(salePrice, plan.downPaymentPct);
    case "INSTALLMENT_DUE": {
      if (plan.installmentCount <= 0) {
        return salePrice - bookingTokenAmount(salePrice, plan.downPaymentPct);
      }
      const remaining =
        salePrice - bookingTokenAmount(salePrice, plan.downPaymentPct);
      return Math.round(remaining / plan.installmentCount);
    }
    case "FULLY_PAID":
      return salePrice;
    default:
      return salePrice;
  }
}

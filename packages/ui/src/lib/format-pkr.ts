/**
 * Formats a monetary amount for display as `PKR X,XXX,XXX`.
 *
 * Money is stored and passed everywhere in this codebase as whole **rupees**
 * (`@sectoria/types` `PkrAmount` — paisa are not used). This function just
 * groups thousands using the `en-PK` locale. Always render PKR through this
 * helper — never `Rs.`, `₨`, or a raw number.
 *
 * @example
 * formatPKR(14_200_000) // "PKR 14,200,000"
 * formatPKR(0)          // "PKR 0"
 */
export function formatPKR(rupees: number): string {
  return `PKR ${Math.round(rupees).toLocaleString("en-PK")}`;
}

/**
 * Masks a Pakistani CNIC for display as `XXXXX-XXXXX-X` — revealing only
 * the 5-digit area prefix and the final check digit, hiding the 7-digit
 * personal serial.
 *
 * Per `security.mdc` and the design system, full CNICs are NEVER rendered
 * to the DOM in public or buyer-facing routes — only in explicitly
 * authorized admin/verification views. Default to this masked form
 * everywhere else.
 *
 * Accepts either the canonical hyphenated form (`35202-1234567-1`) or a
 * raw 13-digit string. Input too short to mask meaningfully is returned
 * unchanged rather than throwing — this is a display helper, not a
 * validator (validation lives in `@sectoria/types`).
 *
 * @example
 * maskCnic("35202-1234567-1") // "35202-XXXXX-1"
 */
export function maskCnic(cnic: string): string {
  const digits = cnic.replace(/\D/g, "");
  if (digits.length < 13) return cnic;
  const area = digits.slice(0, 5);
  const checkDigit = digits.slice(-1);
  return `${area}-XXXXX-${checkDigit}`;
}

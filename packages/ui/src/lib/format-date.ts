/**
 * Formats a date for display as `DD Mon YYYY` (e.g. `12 Jun 2026`) using
 * the `en-PK` locale. This is the only date format used in the Sectoria
 * UI — never `MM/DD/YYYY` (ambiguous) or `YYYY-MM-DD` (machine format).
 *
 * Accepts a `Date` or an ISO 8601 string (the shape timestamps cross
 * boundaries as, per `@sectoria/types`). An unparseable input returns the
 * original string rather than throwing — this is a display helper.
 *
 * @example
 * formatDate("2026-06-12T00:00:00.000Z") // "12 Jun 2026"
 * formatDate(new Date(2026, 5, 12))      // "12 Jun 2026"
 */
export function formatDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) {
    return typeof date === "string" ? date : "";
  }
  return value.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

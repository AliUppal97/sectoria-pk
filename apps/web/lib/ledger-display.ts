import { LedgerEventType, type LedgerEventType as LedgerEventTypeT } from "@sectoria/types";

/**
 * Human labels for the append-only audit ledger's event types, for the buyer's
 * booking audit-trail view. The vocabulary is fixed in `@sectoria/types`; this
 * is only how each kind is named in the UI.
 */
export const LEDGER_LABEL: Record<LedgerEventTypeT, string> = {
  [LedgerEventType.BOOKING_CREATED]: "Booking created",
  [LedgerEventType.ESCROW_TRANSITIONED]: "Escrow updated",
  [LedgerEventType.PLOT_ALLOCATED]: "Plot allocated",
  [LedgerEventType.BALLOT_RUN]: "Ballot drawn",
  [LedgerEventType.DOCUMENT_ISSUED]: "Documents issued",
  [LedgerEventType.COMMISSION_RELEASED]: "Commission released",
  [LedgerEventType.VERIFICATION_COMPLETED]: "Identity verified",
  [LedgerEventType.REVIEW_SUBMITTED]: "Review submitted",
};

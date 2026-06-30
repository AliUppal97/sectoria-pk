import { EscrowState, type EscrowState as EscrowStateType } from "@sectoria/types";
import type { StatusBadgeProps } from "@sectoria/ui";

/**
 * Display metadata for escrow states — the human label and the status-badge
 * colour each maps to. The escrow vocabulary and its legal transitions live in
 * `@sectoria/domain-escrow`; this is purely how the buyer-facing UI names and
 * colours each state (ui-design-system.mdc badge colour mapping).
 */
type BadgeVariant = NonNullable<StatusBadgeProps["variant"]>;

export const ESCROW_LABEL: Record<EscrowStateType, string> = {
  [EscrowState.BOOKING_TOKEN_PAID]: "Token paid",
  [EscrowState.ALLOCATED]: "Plot allocated",
  [EscrowState.INSTALLMENT_DUE]: "Installment due",
  [EscrowState.INSTALLMENT_PAID]: "Installment paid",
  [EscrowState.FULLY_PAID]: "Fully paid",
  [EscrowState.DOCUMENTS_ISSUED]: "Documents issued",
  [EscrowState.COMMISSION_RELEASED]: "Completed",
  [EscrowState.CANCELLED]: "Cancelled",
};

export const ESCROW_BADGE: Record<EscrowStateType, BadgeVariant> = {
  [EscrowState.BOOKING_TOKEN_PAID]: "info",
  [EscrowState.ALLOCATED]: "info",
  [EscrowState.INSTALLMENT_DUE]: "warning",
  [EscrowState.INSTALLMENT_PAID]: "info",
  [EscrowState.FULLY_PAID]: "info",
  [EscrowState.DOCUMENTS_ISSUED]: "success",
  [EscrowState.COMMISSION_RELEASED]: "success",
  [EscrowState.CANCELLED]: "neutral",
};

/** The escrow happy-path, in order — used to render the booking-detail timeline. */
export const ESCROW_HAPPY_PATH: readonly EscrowStateType[] = [
  EscrowState.BOOKING_TOKEN_PAID,
  EscrowState.ALLOCATED,
  EscrowState.INSTALLMENT_DUE,
  EscrowState.INSTALLMENT_PAID,
  EscrowState.FULLY_PAID,
  EscrowState.DOCUMENTS_ISSUED,
  EscrowState.COMMISSION_RELEASED,
];

/** Short plain-language description of what each state means for the buyer. */
export const ESCROW_DESCRIPTION: Record<EscrowStateType, string> = {
  [EscrowState.BOOKING_TOKEN_PAID]:
    "Your booking token is held in escrow. The society will allocate your plot.",
  [EscrowState.ALLOCATED]: "A plot has been reserved against your booking.",
  [EscrowState.INSTALLMENT_DUE]: "An installment is due on your payment plan.",
  [EscrowState.INSTALLMENT_PAID]: "Your latest installment has been received.",
  [EscrowState.FULLY_PAID]: "The full amount has been received in escrow.",
  [EscrowState.DOCUMENTS_ISSUED]:
    "Your transfer documents have been issued by the society.",
  [EscrowState.COMMISSION_RELEASED]:
    "The transaction is complete and escrow has settled.",
  [EscrowState.CANCELLED]: "This booking was cancelled and funds refunded.",
};

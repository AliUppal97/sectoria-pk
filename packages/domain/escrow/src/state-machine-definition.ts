import { EscrowAction, EscrowState } from "@sectoria/types";

/**
 * The single source of truth for which escrow {@link EscrowAction}s are legal
 * from which {@link EscrowState}, and what state each one leads to.
 *
 * This is an explicit, exhaustive table rather than scattered `if` checks: the
 * machine's legality is auditable in one place, and adding or changing a state
 * forces a deliberate edit here (and a matching test) instead of an implicit
 * behaviour change. See `domain-logic.mdc` — "adding a new state requires
 * updating the full transition table, not just the new edge."
 *
 * Money-safety note: cancellation (`CANCEL`) is permitted while the buyer's
 * funds are still held in escrow — up to and including `FULLY_PAID`. This is
 * deliberate: escrow exists precisely to protect the buyer in the window after
 * full payment but before the society delivers title, so a failure to issue
 * documents must remain refundable. Once `DOCUMENTS_ISSUED` (title has
 * transferred) or `COMMISSION_RELEASED` (funds have left escrow) is reached,
 * reversal is a legal unwind/dispute handled outside this forward-only
 * machine, not a simple state transition.
 *
 * Happy path:
 *   BOOKING_TOKEN_PAID → ALLOCATED → INSTALLMENT_DUE ⇄ INSTALLMENT_PAID
 *     → FULLY_PAID → DOCUMENTS_ISSUED → COMMISSION_RELEASED
 */
export type EscrowTransitionTable = Readonly<
  Record<EscrowState, Readonly<Partial<Record<EscrowAction, EscrowState>>>>
>;

export const ESCROW_TRANSITIONS: EscrowTransitionTable = {
  [EscrowState.BOOKING_TOKEN_PAID]: {
    [EscrowAction.ALLOCATE]: EscrowState.ALLOCATED,
    [EscrowAction.CANCEL]: EscrowState.CANCELLED,
  },
  [EscrowState.ALLOCATED]: {
    [EscrowAction.RAISE_INSTALLMENT]: EscrowState.INSTALLMENT_DUE,
    [EscrowAction.CANCEL]: EscrowState.CANCELLED,
  },
  [EscrowState.INSTALLMENT_DUE]: {
    [EscrowAction.PAY_INSTALLMENT]: EscrowState.INSTALLMENT_PAID,
    [EscrowAction.CANCEL]: EscrowState.CANCELLED,
  },
  [EscrowState.INSTALLMENT_PAID]: {
    // Raising the next installment loops back to DUE — this is the ⇄ cycle that
    // repeats once per scheduled installment until the plan is settled.
    [EscrowAction.RAISE_INSTALLMENT]: EscrowState.INSTALLMENT_DUE,
    [EscrowAction.COMPLETE_PAYMENT]: EscrowState.FULLY_PAID,
    [EscrowAction.CANCEL]: EscrowState.CANCELLED,
  },
  [EscrowState.FULLY_PAID]: {
    [EscrowAction.ISSUE_DOCUMENTS]: EscrowState.DOCUMENTS_ISSUED,
    // Funds are fully paid but still held in escrow until documents issue —
    // cancellation here is the buyer's core escrow protection (see note above).
    [EscrowAction.CANCEL]: EscrowState.CANCELLED,
  },
  [EscrowState.DOCUMENTS_ISSUED]: {
    [EscrowAction.RELEASE_COMMISSION]: EscrowState.COMMISSION_RELEASED,
  },
  // Terminal states: enumerated explicitly (empty) so it is unambiguous that
  // nothing legally follows them, rather than left implicit by omission.
  [EscrowState.COMMISSION_RELEASED]: {},
  [EscrowState.CANCELLED]: {},
};

/**
 * The escrow states from which no further transition is legal. Derived from the
 * transition table so it can never drift out of sync with it.
 */
export const TERMINAL_ESCROW_STATES: readonly EscrowState[] = (
  Object.keys(ESCROW_TRANSITIONS) as EscrowState[]
).filter((state) => Object.keys(ESCROW_TRANSITIONS[state]).length === 0);

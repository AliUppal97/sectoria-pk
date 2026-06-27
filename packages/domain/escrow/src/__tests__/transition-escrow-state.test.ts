import { describe, expect, it } from "vitest";
import {
  EscrowAction,
  EscrowState,
  idSchema,
  type Id,
  type IsoDateTime,
} from "@sectoria/types";
import {
  canTransition,
  getLegalActions,
  transitionEscrowState,
} from "../transition-escrow-state.js";
import { TERMINAL_ESCROW_STATES } from "../state-machine-definition.js";
import { InvalidEscrowTransitionError } from "../errors.js";

const BOOKING_ID: Id = idSchema.parse("booking_test_1");
const OCCURRED_AT = "2026-06-27T11:45:00.000Z" as IsoDateTime;

/**
 * The expected legal-transition table, declared here independently of the
 * implementation. The machine is asserted to match this exactly for every
 * state/action pair, so any change to the real transition table must be
 * mirrored here in the same PR — a silent table change cannot pass. See
 * `testing.mdc` ("Adding or changing ... state-transition table requires a
 * new or updated test case in the same PR").
 */
const EXPECTED_LEGAL_TRANSITIONS: Record<
  EscrowState,
  Partial<Record<EscrowAction, EscrowState>>
> = {
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
    [EscrowAction.RAISE_INSTALLMENT]: EscrowState.INSTALLMENT_DUE,
    [EscrowAction.COMPLETE_PAYMENT]: EscrowState.FULLY_PAID,
    [EscrowAction.CANCEL]: EscrowState.CANCELLED,
  },
  [EscrowState.FULLY_PAID]: {
    [EscrowAction.ISSUE_DOCUMENTS]: EscrowState.DOCUMENTS_ISSUED,
    [EscrowAction.CANCEL]: EscrowState.CANCELLED,
  },
  [EscrowState.DOCUMENTS_ISSUED]: {
    [EscrowAction.RELEASE_COMMISSION]: EscrowState.COMMISSION_RELEASED,
  },
  [EscrowState.COMMISSION_RELEASED]: {},
  [EscrowState.CANCELLED]: {},
};

const ALL_STATES = Object.values(EscrowState);
const ALL_ACTIONS = Object.values(EscrowAction);

function isLegal(state: EscrowState, action: EscrowAction): boolean {
  return EXPECTED_LEGAL_TRANSITIONS[state][action] !== undefined;
}

describe("transitionEscrowState — every legal transition from every state", () => {
  for (const state of ALL_STATES) {
    for (const action of ALL_ACTIONS) {
      if (!isLegal(state, action)) continue;

      const expectedNext = EXPECTED_LEGAL_TRANSITIONS[state][action];
      it(`${state} --${action}--> ${expectedNext}`, () => {
        const { nextState, event } = transitionEscrowState({
          currentState: state,
          action,
          bookingId: BOOKING_ID,
          occurredAt: OCCURRED_AT,
        });

        expect(nextState).toBe(expectedNext);
        expect(event.fromState).toBe(state);
        expect(event.toState).toBe(expectedNext);
        expect(event.action).toBe(action);
        expect(event.bookingId).toBe(BOOKING_ID);
        expect(event.occurredAt).toBe(OCCURRED_AT);
      });
    }
  }
});

describe("transitionEscrowState — every illegal transition throws a typed error", () => {
  for (const state of ALL_STATES) {
    for (const action of ALL_ACTIONS) {
      if (isLegal(state, action)) continue;

      it(`rejects ${action} from ${state}`, () => {
        expect(() =>
          transitionEscrowState({
            currentState: state,
            action,
            bookingId: BOOKING_ID,
            occurredAt: OCCURRED_AT,
          }),
        ).toThrow(InvalidEscrowTransitionError);
      });
    }
  }

  it("error message names both the state and the attempted action", () => {
    try {
      transitionEscrowState({
        currentState: EscrowState.CANCELLED,
        action: EscrowAction.ALLOCATE,
        bookingId: BOOKING_ID,
        occurredAt: OCCURRED_AT,
      });
      expect.unreachable("expected transitionEscrowState to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidEscrowTransitionError);
      const typed = error as InvalidEscrowTransitionError;
      expect(typed.name).toBe("InvalidEscrowTransitionError");
      expect(typed.message).toContain(EscrowState.CANCELLED);
      expect(typed.message).toContain(EscrowAction.ALLOCATE);
      expect(typed.fromState).toBe(EscrowState.CANCELLED);
      expect(typed.attemptedAction).toBe(EscrowAction.ALLOCATE);
    }
  });

  it("throws the typed subclass, not a bare Error", () => {
    // DOCUMENTS_ISSUED is past the refundable window — CANCEL is illegal here.
    expect(() =>
      transitionEscrowState({
        currentState: EscrowState.DOCUMENTS_ISSUED,
        action: EscrowAction.CANCEL,
        bookingId: BOOKING_ID,
        occurredAt: OCCURRED_AT,
      }),
    ).toThrow(InvalidEscrowTransitionError);
  });
});

describe("transitionEscrowState — matrix completeness", () => {
  it("covers all 8 states and 7 actions (56 combinations)", () => {
    expect(ALL_STATES).toHaveLength(8);
    expect(ALL_ACTIONS).toHaveLength(7);
    expect(ALL_STATES.length * ALL_ACTIONS.length).toBe(56);
  });

  it("the implementation matches the expected legal table for every pair", () => {
    for (const state of ALL_STATES) {
      for (const action of ALL_ACTIONS) {
        expect(canTransition(state, action)).toBe(isLegal(state, action));
      }
    }
  });
});

describe("escrow happy path — full lifecycle end to end", () => {
  it("walks BOOKING_TOKEN_PAID through to COMMISSION_RELEASED", () => {
    const lifecycle: ReadonlyArray<[EscrowState, EscrowAction, EscrowState]> = [
      [
        EscrowState.BOOKING_TOKEN_PAID,
        EscrowAction.ALLOCATE,
        EscrowState.ALLOCATED,
      ],
      [
        EscrowState.ALLOCATED,
        EscrowAction.RAISE_INSTALLMENT,
        EscrowState.INSTALLMENT_DUE,
      ],
      [
        EscrowState.INSTALLMENT_DUE,
        EscrowAction.PAY_INSTALLMENT,
        EscrowState.INSTALLMENT_PAID,
      ],
      [
        EscrowState.INSTALLMENT_PAID,
        EscrowAction.COMPLETE_PAYMENT,
        EscrowState.FULLY_PAID,
      ],
      [
        EscrowState.FULLY_PAID,
        EscrowAction.ISSUE_DOCUMENTS,
        EscrowState.DOCUMENTS_ISSUED,
      ],
      [
        EscrowState.DOCUMENTS_ISSUED,
        EscrowAction.RELEASE_COMMISSION,
        EscrowState.COMMISSION_RELEASED,
      ],
    ];

    let state: EscrowState = EscrowState.BOOKING_TOKEN_PAID;
    for (const [from, action, to] of lifecycle) {
      expect(state).toBe(from);
      const result = transitionEscrowState({
        currentState: state,
        action,
        bookingId: BOOKING_ID,
        occurredAt: OCCURRED_AT,
      });
      expect(result.nextState).toBe(to);
      state = result.nextState;
    }
    expect(state).toBe(EscrowState.COMMISSION_RELEASED);
  });

  it("supports the INSTALLMENT_DUE ⇄ INSTALLMENT_PAID cycle across installments", () => {
    let state: EscrowState = EscrowState.INSTALLMENT_PAID;
    // Raise the next installment, pay it — repeated cycles must be legal.
    for (let installment = 0; installment < 3; installment++) {
      state = transitionEscrowState({
        currentState: state,
        action: EscrowAction.RAISE_INSTALLMENT,
        bookingId: BOOKING_ID,
        occurredAt: OCCURRED_AT,
      }).nextState;
      expect(state).toBe(EscrowState.INSTALLMENT_DUE);

      state = transitionEscrowState({
        currentState: state,
        action: EscrowAction.PAY_INSTALLMENT,
        bookingId: BOOKING_ID,
        occurredAt: OCCURRED_AT,
      }).nextState;
      expect(state).toBe(EscrowState.INSTALLMENT_PAID);
    }
  });
});

describe("cancellation refund window — escrow protection rule", () => {
  it("allows CANCEL from FULLY_PAID (funds still held in escrow before documents issue)", () => {
    const { nextState } = transitionEscrowState({
      currentState: EscrowState.FULLY_PAID,
      action: EscrowAction.CANCEL,
      bookingId: BOOKING_ID,
      occurredAt: OCCURRED_AT,
    });
    expect(nextState).toBe(EscrowState.CANCELLED);
  });

  it("rejects CANCEL once title has transferred or funds have left escrow", () => {
    for (const past of [
      EscrowState.DOCUMENTS_ISSUED,
      EscrowState.COMMISSION_RELEASED,
    ]) {
      expect(() =>
        transitionEscrowState({
          currentState: past,
          action: EscrowAction.CANCEL,
          bookingId: BOOKING_ID,
          occurredAt: OCCURRED_AT,
        }),
      ).toThrow(InvalidEscrowTransitionError);
    }
  });
});

describe("reading current state is idempotent and side-effect-free", () => {
  it("getLegalActions returns an equal list on repeated calls", () => {
    for (const state of ALL_STATES) {
      const first = getLegalActions(state);
      const second = getLegalActions(state);
      expect(second).toEqual(first);
    }
  });

  it("getLegalActions never mutates the underlying table between reads", () => {
    const before = getLegalActions(EscrowState.INSTALLMENT_PAID);
    // Mutating the returned array must not affect a subsequent read.
    before.push(EscrowAction.ISSUE_DOCUMENTS);
    const after = getLegalActions(EscrowState.INSTALLMENT_PAID);
    expect(after).not.toContain(EscrowAction.ISSUE_DOCUMENTS);
    expect(after).toHaveLength(3);
  });

  it("transitionEscrowState does not mutate its input", () => {
    const input = {
      currentState: EscrowState.BOOKING_TOKEN_PAID,
      action: EscrowAction.ALLOCATE,
      bookingId: BOOKING_ID,
      occurredAt: OCCURRED_AT,
    };
    const snapshot = { ...input };
    transitionEscrowState(input);
    expect(input).toEqual(snapshot);
    expect(input.currentState).toBe(EscrowState.BOOKING_TOKEN_PAID);
  });

  it("terminal states report no legal actions", () => {
    expect(TERMINAL_ESCROW_STATES).toContain(EscrowState.COMMISSION_RELEASED);
    expect(TERMINAL_ESCROW_STATES).toContain(EscrowState.CANCELLED);
    for (const terminal of TERMINAL_ESCROW_STATES) {
      expect(getLegalActions(terminal)).toEqual([]);
    }
  });
});

import {
  escrowActionSchema,
  escrowEventSchema,
  escrowStateSchema,
  type EscrowAction,
  type EscrowEvent,
  type EscrowState,
  type Id,
  type IsoDateTime,
} from "@sectoria/types";
import { ESCROW_TRANSITIONS } from "./state-machine-definition.js";
import { InvalidEscrowTransitionError } from "./errors.js";

/**
 * Everything the machine needs to evaluate and record one escrow transition.
 *
 * The clock is injected (`occurredAt`) rather than read from `Date.now()` — the
 * machine is a pure function, so the same inputs always produce the same event,
 * which is what keeps it deterministic and testable. See `domain-logic.mdc`.
 */
export interface TransitionEscrowStateInput {
  /** The booking's current escrow state. */
  readonly currentState: EscrowState;
  /** The action the caller wishes to apply. */
  readonly action: EscrowAction;
  /** Identifier of the booking this transition belongs to, for the audit event. */
  readonly bookingId: Id;
  /** Caller-supplied timestamp for when the transition occurred (ISO 8601). */
  readonly occurredAt: IsoDateTime;
  /** Optional free-form context recorded on the event (e.g. installment number). */
  readonly metadata?: Record<string, unknown>;
}

/** The result of a successful transition. */
export interface TransitionEscrowStateResult {
  /** The state the booking moves into. */
  readonly nextState: EscrowState;
  /** The audit event describing the transition, for the caller to persist. */
  readonly event: EscrowEvent;
}

/**
 * Validates and applies a single escrow state transition.
 *
 * Looks up `action` in the legal-transition table for `currentState`. If it is
 * legal, returns the `nextState` together with a fully-formed {@link EscrowEvent}
 * for the caller to persist. If it is not legal — or the supplied state/action
 * is not a recognised value — it throws {@link InvalidEscrowTransitionError}
 * with a message naming both the state and the attempted action.
 *
 * Pure function: it computes the next state and builds the event, but never
 * writes to a database — persistence is the caller's job (`packages/api-client`).
 * See `domain-logic.mdc`.
 *
 * @param input - The current state, requested action, and audit context.
 * @returns `{ nextState, event }` for a legal transition.
 * @throws {InvalidEscrowTransitionError} if the transition is illegal or the
 *   state/action is unrecognised.
 */
export function transitionEscrowState(
  input: TransitionEscrowStateInput,
): TransitionEscrowStateResult {
  const currentState = parseState(input.currentState, input.action);
  const action = parseAction(input.currentState, input.action);

  const nextState = ESCROW_TRANSITIONS[currentState][action];
  if (nextState === undefined) {
    throw new InvalidEscrowTransitionError(
      `Cannot apply action "${action}" from escrow state "${currentState}". ` +
        `Legal actions from "${currentState}": ${describeLegalActions(currentState)}.`,
      currentState,
      action,
    );
  }

  // Re-validate the assembled event at the boundary so the output's invariants
  // (branded id, ISO timestamp, enum-valid states) are guaranteed, not assumed.
  const event = escrowEventSchema.parse({
    action,
    fromState: currentState,
    toState: nextState,
    bookingId: input.bookingId,
    occurredAt: input.occurredAt,
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
  });

  return { nextState, event };
}

/**
 * Lists the actions that are legal from a given escrow state. A pure read with
 * no side effects — calling it repeatedly for the same state always returns an
 * equal list and never mutates the transition table.
 */
export function getLegalActions(state: EscrowState): EscrowAction[] {
  const transitions = ESCROW_TRANSITIONS[state];
  if (transitions === undefined) {
    return [];
  }
  return Object.keys(transitions) as EscrowAction[];
}

/**
 * Reports whether `action` is a legal transition out of `state`. A pure read;
 * safe to call repeatedly without consequence.
 */
export function canTransition(
  state: EscrowState,
  action: EscrowAction,
): boolean {
  return ESCROW_TRANSITIONS[state]?.[action] !== undefined;
}

/** Parses the current state, raising the typed escrow error on an unknown value. */
function parseState(
  rawState: EscrowState,
  rawAction: EscrowAction,
): EscrowState {
  const parsed = escrowStateSchema.safeParse(rawState);
  if (!parsed.success) {
    throw new InvalidEscrowTransitionError(
      `Unknown escrow state: ${JSON.stringify(rawState)}.`,
      rawState,
      rawAction,
    );
  }
  return parsed.data;
}

/** Parses the requested action, raising the typed escrow error on an unknown value. */
function parseAction(
  rawState: EscrowState,
  rawAction: EscrowAction,
): EscrowAction {
  const parsed = escrowActionSchema.safeParse(rawAction);
  if (!parsed.success) {
    throw new InvalidEscrowTransitionError(
      `Unknown escrow action: ${JSON.stringify(rawAction)}.`,
      rawState,
      rawAction,
    );
  }
  return parsed.data;
}

/** Human-readable list of legal actions for an error message ("none" if terminal). */
function describeLegalActions(state: EscrowState): string {
  const actions = getLegalActions(state);
  return actions.length > 0 ? actions.join(", ") : "none (terminal state)";
}

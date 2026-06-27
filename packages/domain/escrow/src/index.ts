/**
 * `@sectoria/domain-escrow` — the escrow booking state machine.
 *
 * Pure, framework-free business logic: it validates and applies transitions
 * between {@link EscrowState} values and returns `{ nextState, event }` for the
 * caller to persist, with zero dependencies on Next.js, Prisma, or React. The
 * full legal-transition table lives in `state-machine-definition.ts`. Import
 * everything from this barrel, not from individual files.
 */
export {
  transitionEscrowState,
  getLegalActions,
  canTransition,
  type TransitionEscrowStateInput,
  type TransitionEscrowStateResult,
} from "./transition-escrow-state.js";
export {
  ESCROW_TRANSITIONS,
  TERMINAL_ESCROW_STATES,
  type EscrowTransitionTable,
} from "./state-machine-definition.js";
export { InvalidEscrowTransitionError } from "./errors.js";

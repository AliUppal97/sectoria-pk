/**
 * `@sectoria/domain-allocation` — plot allocation by strategy.
 *
 * Pure, framework-free business logic: given a category snapshot and a booking,
 * {@link allocatePlot} either assigns the lowest available serial plot
 * immediately (`FIFO`) or returns a pending result that queues the booking for
 * the deterministic draw (`BALLOT`), with zero dependencies on Next.js, Prisma,
 * or React. A category with no available plots throws {@link NoAvailableUnitsError}
 * rather than returning an empty result. Import everything from this barrel,
 * not from individual files.
 */
export { allocatePlot } from "./allocate-plot.js";
export { allocateFifo } from "./strategies/fifo-strategy.js";
export { allocateBallot } from "./strategies/ballot-strategy.js";
export {
  NoAvailableUnitsError,
  UnknownAllocationStrategyError,
} from "./errors.js";

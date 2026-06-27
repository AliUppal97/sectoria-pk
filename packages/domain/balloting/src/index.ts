/**
 * `@sectoria/domain-balloting` — the deterministic, seeded plot ballot.
 *
 * Pure, framework-free business logic: given a pool of `entries`, the
 * `availablePlots` up for allocation, and a published `seed`, {@link runBallot}
 * produces an auditable {@link BallotResult} with zero dependencies on Next.js,
 * Prisma, or React. The same entries and seed always yield the same result, so
 * any third party can reproduce and verify a draw. The hashing/RNG helpers are
 * re-exported so a verifier can independently recompute the input fingerprint.
 * Import everything from this barrel, not from individual files.
 */
export { runBallot } from "./run-ballot.js";
export { EmptyBallotError, DuplicateBallotEntryError } from "./errors.js";
export {
  sha256Hex,
  hashBallotInputSet,
  createSeededRandom,
  deterministicShuffle,
} from "./seed-utils.js";

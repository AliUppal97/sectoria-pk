import {
  ballotEntrySchema,
  ballotResultSchema,
  plotSlotSchema,
  type BallotAssignment,
  type BallotEntry,
  type BallotResult,
  type PlotSlot,
} from "@sectoria/types";
import { DuplicateBallotEntryError, EmptyBallotError } from "./errors.js";
import {
  createSeededRandom,
  deterministicShuffle,
  hashBallotInputSet,
} from "./seed-utils.js";

/**
 * Runs a cryptographically-seeded, deterministic, auditable balloting round.
 *
 * Given the same `entries` and `seed`, this always produces the same
 * {@link BallotResult} — and that determinism, not secrecy, is the basis of
 * fairness here: anyone holding the entry set and the published seed can
 * re-run the draw and confirm the outcome, and the returned `inputHash`
 * proves exactly which set was drawn over. The result is the input to the
 * append-only audit ledger (see `packages/domain/ledger`).
 *
 * The randomness is derived solely from `seed`, and entries/plots are sorted
 * into a canonical order before the draw, so the result never depends on the
 * incidental order the arrays happened to be in. Plots are awarded to the
 * shuffled winners in ascending `serialNo` order; if the round is
 * oversubscribed (more entries than plots), the losers are returned in
 * `unassignedBookingIds`.
 *
 * Pure function: it computes and returns the result but performs no I/O and
 * writes to no database — persistence is the caller's job. See
 * `domain-logic.mdc`.
 *
 * @param entries - The pool of bookings competing in the draw. Must be non-empty.
 * @param availablePlots - The plot slots up for allocation, identified by serial.
 * @param seed - The published seed driving the draw; the sole source of randomness.
 * @returns A fully-formed, schema-validated {@link BallotResult}.
 * @throws {EmptyBallotError} if `entries` is empty.
 * @throws {DuplicateBallotEntryError} if a `bookingId` appears more than once.
 */
export function runBallot(
  entries: readonly BallotEntry[],
  availablePlots: readonly PlotSlot[],
  seed: string,
): BallotResult {
  if (entries.length === 0) {
    throw new EmptyBallotError();
  }

  // Validate every input at the boundary so the draw operates only on
  // well-formed, branded data (e.g. non-empty ids and serials).
  const parsedEntries = entries.map((entry) => ballotEntrySchema.parse(entry));
  const parsedPlots = availablePlots.map((plot) => plotSlotSchema.parse(plot));

  assertNoDuplicateBookings(parsedEntries);

  const canonicalEntries = [...parsedEntries].sort((a, b) =>
    compareStrings(a.bookingId, b.bookingId),
  );
  const canonicalPlots = [...parsedPlots].sort((a, b) =>
    compareStrings(a.serialNo, b.serialNo),
  );

  const inputHash = hashBallotInputSet(canonicalEntries, canonicalPlots, seed);

  const random = createSeededRandom(seed);
  const shuffledEntries = deterministicShuffle(canonicalEntries, random);

  const assignments: BallotAssignment[] = [];
  const unassignedBookingIds: BallotEntry["bookingId"][] = [];

  shuffledEntries.forEach((entry, index) => {
    const plot = canonicalPlots[index];
    if (plot === undefined) {
      // More entries than plots: this winner-by-rank drew no plot.
      unassignedBookingIds.push(entry.bookingId);
      return;
    }
    assignments.push({
      position: index + 1,
      bookingId: entry.bookingId,
      plotId: plot.plotId,
      serialNo: plot.serialNo,
    });
  });

  const verificationStatement = buildVerificationStatement({
    seed,
    inputHash,
    totalEntries: canonicalEntries.length,
    totalPlots: canonicalPlots.length,
    assignedCount: assignments.length,
  });

  // Re-validate the assembled result so its invariants (hex digest shape,
  // branded ids, non-negative counts) are guaranteed on the way out.
  return ballotResultSchema.parse({
    seed,
    inputHash,
    assignments,
    unassignedBookingIds,
    totalEntries: canonicalEntries.length,
    totalPlots: canonicalPlots.length,
    verificationStatement,
  });
}

/** Throws {@link DuplicateBallotEntryError} on the first repeated booking id. */
function assertNoDuplicateBookings(entries: readonly BallotEntry[]): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.bookingId)) {
      throw new DuplicateBallotEntryError(entry.bookingId);
    }
    seen.add(entry.bookingId);
  }
}

/**
 * Locale-independent string comparison by UTF-16 code unit. Deliberately not
 * `localeCompare` — collation rules vary by locale and would make the
 * canonical ordering (and therefore the draw) non-reproducible across machines.
 */
function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

interface VerificationStatementParts {
  readonly seed: string;
  readonly inputHash: string;
  readonly totalEntries: number;
  readonly totalPlots: number;
  readonly assignedCount: number;
}

/** Builds the human-readable, PDF-ready summary of a completed draw. */
function buildVerificationStatement(parts: VerificationStatementParts): string {
  const { seed, inputHash, totalEntries, totalPlots, assignedCount } = parts;
  return (
    `Ballot drawn with seed "${seed}" over ${totalEntries} ` +
    `${pluralize(totalEntries, "entry", "entries")} and ${totalPlots} ` +
    `${pluralize(totalPlots, "plot", "plots")}, assigning ${assignedCount} ` +
    `${pluralize(assignedCount, "plot", "plots")}. ` +
    `Input fingerprint (SHA-256): ${inputHash}. ` +
    `Re-running with the identical entries and seed reproduces this exact result.`
  );
}

/** Picks the singular or plural noun for `count`. */
function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

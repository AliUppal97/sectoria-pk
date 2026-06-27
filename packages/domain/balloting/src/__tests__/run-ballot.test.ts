import { describe, expect, it } from "vitest";
import { idSchema, type BallotEntry, type PlotSlot } from "@sectoria/types";
import { runBallot } from "../run-ballot.js";
import { hashBallotInputSet, sha256Hex } from "../seed-utils.js";
import { DuplicateBallotEntryError, EmptyBallotError } from "../errors.js";

const SEED = "2026-ballot-phase-2-block-c";

function entry(id: string): BallotEntry {
  return { bookingId: idSchema.parse(id) };
}

function plot(id: string, serialNo: string): PlotSlot {
  return { plotId: idSchema.parse(id), serialNo };
}

function makeEntries(count: number): BallotEntry[] {
  return Array.from({ length: count }, (_, i) => entry(`booking_${i + 1}`));
}

function makePlots(count: number): PlotSlot[] {
  return Array.from({ length: count }, (_, i) =>
    plot(`plot_${i + 1}`, String(i + 1).padStart(4, "0")),
  );
}

describe("runBallot — determinism (the fairness guarantee)", () => {
  it("produces a deeply-equal result when called twice with the same input", () => {
    const entries = makeEntries(10);
    const plots = makePlots(6);

    const first = runBallot(entries, plots, SEED);
    const second = runBallot(entries, plots, SEED);

    expect(second).toEqual(first);
  });

  it("is independent of the order entries and plots are supplied in", () => {
    const entries = makeEntries(8);
    const plots = makePlots(5);

    const ordered = runBallot(entries, plots, SEED);
    const shuffled = runBallot(
      [...entries].reverse(),
      [...plots].reverse(),
      SEED,
    );

    expect(shuffled).toEqual(ordered);
  });

  it("yields a different ordering for a different seed", () => {
    const entries = makeEntries(12);
    const plots = makePlots(12);

    const a = runBallot(entries, plots, "seed-alpha");
    const b = runBallot(entries, plots, "seed-beta");

    // Same set, so the same plots are handed out, but the winners' positions
    // should differ — otherwise the seed would not be driving the draw.
    expect(b.assignments).not.toEqual(a.assignments);
    expect(b.inputHash).not.toBe(a.inputHash);
  });
});

describe("runBallot — auditable output (seed + SHA-256 of inputs)", () => {
  it("returns the seed and a verifiable SHA-256 hash of the input set", () => {
    const entries = makeEntries(4);
    const plots = makePlots(3);

    const result = runBallot(entries, plots, SEED);

    expect(result.seed).toBe(SEED);
    expect(result.inputHash).toMatch(/^[a-f0-9]{64}$/);

    // A third party can recompute the fingerprint from the canonical
    // (sorted) input set and the seed — this is the verification path.
    const expectedHash = hashBallotInputSet(
      [...entries].sort((x, y) =>
        x.bookingId < y.bookingId ? -1 : x.bookingId > y.bookingId ? 1 : 0,
      ),
      [...plots].sort((x, y) =>
        x.serialNo < y.serialNo ? -1 : x.serialNo > y.serialNo ? 1 : 0,
      ),
      SEED,
    );
    expect(result.inputHash).toBe(expectedHash);
  });

  it("changes the input hash when the entry set changes", () => {
    const plots = makePlots(2);
    const a = runBallot(makeEntries(3), plots, SEED);
    const b = runBallot(makeEntries(4), plots, SEED);
    expect(b.inputHash).not.toBe(a.inputHash);
  });

  it("includes the seed and hash in the human-readable verification statement", () => {
    const result = runBallot(makeEntries(3), makePlots(2), SEED);
    expect(result.verificationStatement).toContain(SEED);
    expect(result.verificationStatement).toContain(result.inputHash);
  });

  it("uses a real SHA-256 digest (matches an independent hash of a known string)", () => {
    // Guards against the hash helper silently degrading to a non-SHA-256 digest.
    expect(sha256Hex("sectoria")).toHaveLength(64);
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});

describe("runBallot — assignment correctness", () => {
  it("assigns exactly min(entries, plots) plots when oversubscribed", () => {
    const result = runBallot(makeEntries(10), makePlots(4), SEED);
    expect(result.assignments).toHaveLength(4);
    expect(result.unassignedBookingIds).toHaveLength(6);
    expect(result.totalEntries).toBe(10);
    expect(result.totalPlots).toBe(4);
  });

  it("assigns every entry and leaves no booking unassigned when undersubscribed", () => {
    const result = runBallot(makeEntries(3), makePlots(7), SEED);
    expect(result.assignments).toHaveLength(3);
    expect(result.unassignedBookingIds).toEqual([]);
  });

  it("hands plots out in ascending serial order to the ranked winners", () => {
    const result = runBallot(makeEntries(6), makePlots(6), SEED);
    const serials = result.assignments.map((a) => a.serialNo);
    expect(serials).toEqual([...serials].sort());
    expect(result.assignments.map((a) => a.position)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("gives every winner a distinct plot and every entry exactly one outcome", () => {
    const result = runBallot(makeEntries(8), makePlots(5), SEED);

    const assignedPlots = result.assignments.map((a) => a.plotId);
    expect(new Set(assignedPlots).size).toBe(assignedPlots.length);

    const assignedBookings = result.assignments.map((a) => a.bookingId);
    const everyBooking = [...assignedBookings, ...result.unassignedBookingIds];
    expect(new Set(everyBooking).size).toBe(8);
  });

  it("treats the first and last entry in the pool as eligible winners", () => {
    // Boundary case from testing.mdc: first and last item in a balloting pool.
    const entries = makeEntries(20);
    const result = runBallot(entries, makePlots(20), SEED);
    const winners = new Set(result.assignments.map((a) => a.bookingId));
    expect(winners.has(entries[0]!.bookingId)).toBe(true);
    expect(winners.has(entries[entries.length - 1]!.bookingId)).toBe(true);
  });

  it("does not mutate its input arrays", () => {
    const entries = makeEntries(5);
    const plots = makePlots(3);
    const entriesSnapshot = entries.map((e) => ({ ...e }));
    const plotsSnapshot = plots.map((p) => ({ ...p }));

    runBallot(entries, plots, SEED);

    expect(entries).toEqual(entriesSnapshot);
    expect(plots).toEqual(plotsSnapshot);
  });
});

describe("runBallot — invalid input throws typed, descriptive errors", () => {
  it("throws EmptyBallotError on an empty entries array", () => {
    expect(() => runBallot([], makePlots(3), SEED)).toThrow(EmptyBallotError);
  });

  it("the empty-entries error carries a descriptive message", () => {
    try {
      runBallot([], makePlots(1), SEED);
      expect.unreachable("expected runBallot to throw on empty entries");
    } catch (error) {
      expect(error).toBeInstanceOf(EmptyBallotError);
      expect((error as EmptyBallotError).message).toMatch(/empty/i);
    }
  });

  it("throws DuplicateBallotEntryError when a booking enters twice", () => {
    const entries = [entry("booking_dup"), entry("booking_dup")];
    expect(() => runBallot(entries, makePlots(2), SEED)).toThrow(
      DuplicateBallotEntryError,
    );
  });

  it("the duplicate error names the offending bookingId", () => {
    const entries = [entry("booking_x"), entry("booking_y"), entry("booking_x")];
    try {
      runBallot(entries, makePlots(2), SEED);
      expect.unreachable("expected runBallot to throw on a duplicate entry");
    } catch (error) {
      expect(error).toBeInstanceOf(DuplicateBallotEntryError);
      expect((error as DuplicateBallotEntryError).bookingId).toBe("booking_x");
      expect((error as DuplicateBallotEntryError).message).toContain(
        "booking_x",
      );
    }
  });

  it("allows a single-entry, single-plot ballot (minimum viable draw)", () => {
    const result = runBallot([entry("booking_only")], makePlots(1), SEED);
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]!.position).toBe(1);
    expect(result.unassignedBookingIds).toEqual([]);
  });
});

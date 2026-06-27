import { createHash } from "node:crypto";
import type { BallotEntry, PlotSlot } from "@sectoria/types";

/**
 * Deterministic cryptographic helpers behind the ballot draw. Everything here
 * is pure and synchronous: `node:crypto`'s `createHash` is CPU-only hashing
 * (no I/O, no framework), so the same inputs always produce the same output —
 * which is exactly what makes a ballot independently auditable. See
 * `domain-logic.mdc` (no unseeded randomness in `packages/domain`).
 */

/** Number of hex characters that encode 52 bits — the mantissa of a JS double. */
const HEX_CHARS_FOR_52_BITS = 13;
/** 2^52, the divisor that maps a 52-bit integer into the half-open range [0, 1). */
const TWO_POW_52 = 2 ** 52;

/** Computes the lowercase hex SHA-256 digest of a UTF-8 string. */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Produces a stable SHA-256 fingerprint of the exact set that went into a
 * ballot. Entries and plots are reduced to a canonical, key-ordered shape and
 * the seed is folded in, so the hash uniquely identifies "these entries, these
 * plots, this seed" — the proof a third party checks when re-verifying a draw.
 *
 * Callers must pass the already-canonicalised (sorted) arrays so the hash is
 * independent of incidental input ordering.
 */
export function hashBallotInputSet(
  canonicalEntries: readonly BallotEntry[],
  canonicalPlots: readonly PlotSlot[],
  seed: string,
): string {
  const canonical = JSON.stringify({
    seed,
    entries: canonicalEntries.map((entry) => ({
      bookingId: entry.bookingId,
      buyerId: entry.buyerId ?? null,
    })),
    plots: canonicalPlots.map((plot) => ({
      plotId: plot.plotId,
      serialNo: plot.serialNo,
      plotNo: plot.plotNo ?? null,
    })),
  });
  return sha256Hex(canonical);
}

/**
 * Builds a deterministic pseudo-random generator from a seed string. Each call
 * hashes `${seed}#${counter}` and maps the digest's top 52 bits into [0, 1).
 * Using SHA-256 per step (rather than a 32-bit PRNG) keeps the sequence
 * platform-independent and reproducible from the seed alone — no reliance on
 * `Math.random`, which `domain-logic.mdc` forbids here.
 */
export function createSeededRandom(seed: string): () => number {
  let counter = 0;
  return () => {
    const digest = sha256Hex(`${seed}#${counter}`);
    counter += 1;
    const bits = Number.parseInt(digest.slice(0, HEX_CHARS_FOR_52_BITS), 16);
    return bits / TWO_POW_52;
  };
}

/**
 * Returns a new array containing `items` shuffled with a Fisher-Yates pass
 * driven by `random`. Pure: it never mutates the input and, given the same
 * items and the same generator sequence, always produces the same ordering.
 */
export function deterministicShuffle<T>(
  items: readonly T[],
  random: () => number,
): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    // i and j are always valid indices (0..length-1), so these reads are
    // defined; the assertions only satisfy `noUncheckedIndexedAccess`.
    const atI = result[i]!;
    const atJ = result[j]!;
    result[i] = atJ;
    result[j] = atI;
  }
  return result;
}

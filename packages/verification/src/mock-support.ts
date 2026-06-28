import type { IsoDateTime } from "@sectoria/types";

/**
 * Shared helpers for the `Mock*` verification adapters: a simulated network
 * delay plus injectable clock and RNG so the demo data is realistic in
 * development yet fast and deterministic in tests.
 *
 * The mocks deliberately do *not* resolve instantly — an instant resolve hides
 * loading-state bugs in the UI (see `verification-adapters.mdc`). The default
 * delay is a realistic 1–2 seconds; tests pass `minLatencyMs: 0` (or a recording
 * `sleep`) to stay fast while still exercising the latency code path.
 */

/** Default lower bound for simulated latency, in milliseconds. */
export const DEFAULT_MIN_LATENCY_MS = 1_000;

/** Default upper bound for simulated latency, in milliseconds. */
export const DEFAULT_MAX_LATENCY_MS = 2_000;

/**
 * Tunables for a mock adapter. Every field is optional; the defaults produce
 * realistic behaviour. Inject `sleep`, `random`, and `now` in tests to keep them
 * fast and deterministic.
 */
export interface MockAdapterOptions {
  /** Lower bound of the simulated delay, in ms. Defaults to 1000. */
  readonly minLatencyMs?: number;
  /** Upper bound of the simulated delay, in ms. Defaults to 2000. */
  readonly maxLatencyMs?: number;
  /** Delay implementation. Defaults to a real `setTimeout`-based sleep. */
  readonly sleep?: (ms: number) => Promise<void>;
  /** RNG in the range [0, 1). Defaults to `Math.random`. */
  readonly random?: () => number;
  /** Clock used for response timestamps. Defaults to `() => new Date()`. */
  readonly now?: () => Date;
}

/** A fully-resolved set of mock options with no optional fields. */
export interface ResolvedMockOptions {
  readonly minLatencyMs: number;
  readonly maxLatencyMs: number;
  readonly sleep: (ms: number) => Promise<void>;
  readonly random: () => number;
  readonly now: () => Date;
}

const realSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fills in defaults and validates the latency window. A negative bound or a max
 * below the min is a programming error, so it throws synchronously at
 * construction time rather than producing surprising behaviour later.
 */
export function resolveMockOptions(
  options: MockAdapterOptions = {},
): ResolvedMockOptions {
  const minLatencyMs = options.minLatencyMs ?? DEFAULT_MIN_LATENCY_MS;
  const maxLatencyMs = options.maxLatencyMs ?? DEFAULT_MAX_LATENCY_MS;

  if (minLatencyMs < 0 || maxLatencyMs < 0) {
    throw new RangeError("Mock latency bounds must be non-negative.");
  }
  if (maxLatencyMs < minLatencyMs) {
    throw new RangeError(
      `Mock maxLatencyMs (${maxLatencyMs}) must be >= minLatencyMs (${minLatencyMs}).`,
    );
  }

  return {
    minLatencyMs,
    maxLatencyMs,
    sleep: options.sleep ?? realSleep,
    random: options.random ?? Math.random,
    now: options.now ?? (() => new Date()),
  };
}

/**
 * Awaits a delay uniformly chosen within the configured latency window. Returns
 * the delay it used so callers/tests can assert on it.
 */
export async function simulateLatency(
  options: ResolvedMockOptions,
): Promise<number> {
  const span = options.maxLatencyMs - options.minLatencyMs;
  const delayMs = Math.round(options.minLatencyMs + options.random() * span);
  await options.sleep(delayMs);
  return delayMs;
}

/** The configured clock as a validated ISO 8601 timestamp string. */
export function nowIso(options: ResolvedMockOptions): IsoDateTime {
  return options.now().toISOString() as IsoDateTime;
}

/**
 * Maps an arbitrary seed string to a stable index in `[0, length)` using a
 * simple FNV-style rolling hash. The same seed always yields the same index, so
 * a given CNIC/cert number deterministically maps to the same demo record —
 * which keeps mock responses stable across repeated calls and test runs.
 */
export function pickIndex(seed: string, length: number): number {
  if (length <= 0) {
    throw new RangeError("pickIndex length must be a positive integer.");
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

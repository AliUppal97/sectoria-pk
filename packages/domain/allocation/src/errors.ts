/**
 * Typed errors for the allocation domain. Allocation throws these (never a
 * bare `Error`) so callers and tests can tell a legitimately-blocked
 * allocation from a programming bug, and so an API layer can map them to a
 * stable error code. See `domain-logic.mdc`: invalid input must throw a
 * descriptive, typed error — never silently return an empty/`null` result.
 */

/**
 * Thrown when allocation is attempted against a category that has zero
 * available plots. Neither strategy can proceed: `FIFO` has no serial to
 * assign, and a `BALLOT` over an empty pool of plots can never produce a
 * winner — so it fails loudly rather than returning a result a caller might
 * mistake for a real assignment or a meaningful pending entry.
 */
export class NoAvailableUnitsError extends Error {
  /**
   * @param categoryId - The category that had no available plots.
   * @param message - Optional override for the default descriptive message.
   */
  constructor(
    public readonly categoryId: string,
    message?: string,
  ) {
    super(
      message ??
        `Cannot allocate a plot from category "${categoryId}": it has zero available units.`,
    );
    this.name = "NoAvailableUnitsError";
    // Restore the prototype chain so `instanceof` works after transpilation,
    // keeping the typed-error contract reliable for callers and tests.
    Object.setPrototypeOf(this, NoAvailableUnitsError.prototype);
  }
}

/**
 * Thrown when a category snapshot carries an `allocationStrategy` this domain
 * has no handler for. In practice the {@link allocationStrategySchema} guards
 * against unknown values at the boundary; this error exists to make the
 * dispatch switch exhaustive and to fail loudly if a new strategy is added to
 * the enum without a corresponding implementation here.
 */
export class UnknownAllocationStrategyError extends Error {
  /**
   * @param strategy - The unrecognised strategy value.
   * @param message - Optional override for the default descriptive message.
   */
  constructor(
    public readonly strategy: string,
    message?: string,
  ) {
    super(
      message ??
        `Unknown allocation strategy "${strategy}"; no allocator is implemented for it.`,
    );
    this.name = "UnknownAllocationStrategyError";
    Object.setPrototypeOf(this, UnknownAllocationStrategyError.prototype);
  }
}

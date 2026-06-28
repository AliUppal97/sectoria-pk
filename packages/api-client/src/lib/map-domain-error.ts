import { TRPCError } from "@trpc/server";
import { InvalidTaxInputError } from "@sectoria/domain-tax";
import { InvalidEscrowTransitionError } from "@sectoria/domain-escrow";
import { NoAvailableUnitsError } from "@sectoria/domain-allocation";
import { InvalidLedgerEventError } from "@sectoria/domain-ledger";
import {
  InvalidVerificationInputError,
  VerificationTimeoutError,
} from "@sectoria/verification";

/**
 * Translates a domain/verification error into the right typed {@link TRPCError}
 * so the client can branch on `code` instead of parsing a message string, and so
 * internal details never leak as a raw error (see `middleware-and-guards.mdc` on
 * pipeline error handling).
 *
 * A `TRPCError` thrown deliberately by a guard passes through unchanged. An
 * unrecognised error becomes `INTERNAL_SERVER_ERROR` with the original attached
 * as `cause` for server-side logging — never surfaced to the client verbatim.
 *
 * @param error - Anything thrown while composing domain logic + persistence.
 * @returns The equivalent `TRPCError`.
 */
export function mapDomainError(error: unknown): TRPCError {
  if (error instanceof TRPCError) {
    return error;
  }

  // Bad input the caller could fix: malformed values, illegal state transitions.
  if (
    error instanceof InvalidTaxInputError ||
    error instanceof InvalidEscrowTransitionError ||
    error instanceof InvalidLedgerEventError ||
    error instanceof InvalidVerificationInputError
  ) {
    return new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
      cause: error,
    });
  }

  // A request that conflicts with current resource state (e.g. no plots left).
  if (error instanceof NoAvailableUnitsError) {
    return new TRPCError({
      code: "CONFLICT",
      message: error.message,
      cause: error,
    });
  }

  // "Couldn't check right now" — distinct from a denial, per verification-adapters.mdc.
  if (error instanceof VerificationTimeoutError) {
    return new TRPCError({
      code: "TIMEOUT",
      message: error.message,
      cause: error,
    });
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
    cause: error,
  });
}

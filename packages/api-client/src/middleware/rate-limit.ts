import { TRPCError } from "@trpc/server";
import { middleware } from "../trpc.js";

/** How a rate-limit bucket is keyed. */
export type RateLimitScopeBy = "identity" | "ip";

/** Configuration for a {@link rateLimit} guard. */
export interface RateLimitOptions {
  /** A short, stable label for the bucket, e.g. `"verification"` or `"booking"`. */
  readonly scope: string;
  /**
   * Which caller key to bucket on:
   * - `"identity"` (default): the authenticated user id — for post-auth actions.
   * - `"ip"`: the client IP — for endpoints reachable before auth, where the
   *   abuse case is unauthenticated (see `middleware-and-guards.mdc`).
   */
  readonly by?: RateLimitScopeBy;
}

/**
 * Builds a rate-limit guard. It runs as early as the pipeline allows so abuse
 * is bounded before any expensive work (a verification call, a booking write).
 *
 * The limiter itself is injected via `ctx.rateLimiter`. When none is configured
 * (the default in development and tests), the guard passes through — limiting is
 * an operational concern wired in `apps/web`, not something a unit test should
 * need Redis for. Production wiring is required for the endpoints listed in
 * `security.mdc` (auth, booking-token, verification triggers).
 *
 * @param options - The bucket scope and keying strategy.
 * @returns A tRPC middleware enforcing the limit.
 * @throws {TRPCError} `TOO_MANY_REQUESTS` when the caller exceeds the limit.
 */
export function rateLimit(options: RateLimitOptions) {
  const by: RateLimitScopeBy = options.by ?? "identity";
  return middleware(async ({ ctx, next }) => {
    if (ctx.rateLimiter === null) {
      return next();
    }

    const callerKey =
      by === "identity" && ctx.session !== null
        ? ctx.session.user.id
        : (ctx.clientId ?? "anonymous");

    const { success } = await ctx.rateLimiter.limit(
      `${options.scope}:${callerKey}`,
    );
    if (!success) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please wait a moment and try again.",
      });
    }
    return next();
  });
}

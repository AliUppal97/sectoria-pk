/**
 * `@sectoria/api-client` — the tRPC composition root.
 *
 * This is the single layer permitted to import from both `@sectoria/domain-*`
 * and `@sectoria/database` (see `api-trpc.mdc`). It exposes:
 *
 * - {@link appRouter} / {@link AppRouter} — the merged router and its type. The
 *   web app mounts the router in its tRPC route handler and imports *only the
 *   type* to build a fully-typed client.
 * - {@link createTRPCContext} and the {@link TRPCContext} contract — how a host
 *   (the web app, a test) injects the database client, verification adapters,
 *   session, rate limiter, clock, and id generator per request.
 * - {@link createCallerFactory} — for server-side calls (React Server
 *   Components, tests) without going over HTTP.
 * - The named procedure builders and guards, for any out-of-tree router.
 *
 * Import everything from this barrel, not from individual files.
 */
export { appRouter, type AppRouter } from "./root-router.js";

export {
  createTRPCContext,
  createCallerFactory,
  router,
  middleware,
  publicProcedure,
  TRPCError,
  type TRPCContext,
  type CreateTRPCContextOptions,
  type Session,
  type SessionUser,
  type RateLimiter,
  type RateLimitResult,
} from "./trpc.js";

export {
  protectedProcedure,
  verifiedBuyerProcedure,
  societyAdminProcedure,
  dealerProcedure,
  superAdminProcedure,
} from "./procedures.js";

export { requireAuth, requireRole } from "./middleware/require-role.js";
export { requireNadraVerified } from "./middleware/require-nadra-verified.js";
export { assertSocietyOwnership } from "./middleware/require-society-ownership.js";
export {
  rateLimit,
  type RateLimitOptions,
  type RateLimitScopeBy,
} from "./middleware/rate-limit.js";

export { mapDomainError } from "./lib/map-domain-error.js";

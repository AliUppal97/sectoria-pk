import { UserRole } from "@sectoria/types";
import { publicProcedure } from "./trpc.js";
import { requireAuth, requireRole } from "./middleware/require-role.js";
import { requireNadraVerified } from "./middleware/require-nadra-verified.js";

/**
 * The named procedure variants every router composes on top of. Each layers the
 * guards required for its access tier so a router never re-writes the same
 * `if (role !== …)` chain inline (see `middleware-and-guards.mdc`). Resource
 * *ownership* — "the admin of *this* society", "the buyer of *this* booking" —
 * is enforced inside the procedure after the resource is loaded, via the guards
 * in `middleware/require-society-ownership.ts`.
 */

/** Unauthenticated. Public marketplace reads (society/dealer listings). */
export { publicProcedure };

/** Any authenticated user, regardless of role. */
export const protectedProcedure = publicProcedure.use(requireAuth);

/**
 * A NADRA-verified `BUYER`. The role gate AND the identity-verification gate
 * are both required — this is the entry point for money-moving buyer actions
 * (creating a booking), which must never rest on session presence alone.
 */
export const verifiedBuyerProcedure = publicProcedure
  .use(requireRole(UserRole.BUYER))
  .use(requireNadraVerified);

/**
 * A `SOCIETY_ADMIN` (or `SUPER_ADMIN`, who may administer any society). The role
 * gate is the coarse check; the procedure must still assert ownership of the
 * specific society/category/booking it touches.
 */
export const societyAdminProcedure = publicProcedure.use(
  requireRole(UserRole.SOCIETY_ADMIN, UserRole.SUPER_ADMIN),
);

/** A `DEALER_PARTNER`. Dealer-profile, DNFBP, and lead actions build on this. */
export const dealerProcedure = publicProcedure.use(
  requireRole(UserRole.DEALER_PARTNER),
);

/** Platform staff only. Moderation, the ledger viewer, and revenue. */
export const superAdminProcedure = publicProcedure.use(
  requireRole(UserRole.SUPER_ADMIN),
);

import { TRPCError } from "@trpc/server";
import { middleware, type Session } from "../trpc.js";

/**
 * Gates an action on the caller having completed NADRA CNIC verification.
 *
 * NADRA verification is a *stronger, separate* assertion than being signed in
 * (see `auth-and-access-control.mdc`): a user can be authenticated yet not
 * identity-verified. Money-moving actions (creating a booking, paying a token)
 * must require this explicitly rather than treating "logged in" as sufficient.
 *
 * @throws {TRPCError} `UNAUTHORIZED` when unauthenticated, `FORBIDDEN` when the
 *   session user is not NADRA-verified.
 */
export const requireNadraVerified = middleware(({ ctx, next }) => {
  if (ctx.session === null) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }
  if (!ctx.session.user.nadraVerified) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "NADRA identity verification is required before you can take this action.",
    });
  }
  return next({ ctx: { session: ctx.session as Session } });
});

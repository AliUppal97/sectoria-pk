import { TRPCError } from "@trpc/server";
import type { UserRole } from "@sectoria/types";
import { middleware, type Session } from "../trpc.js";

/**
 * Asserts only that the caller is authenticated, narrowing `ctx.session` to a
 * non-null {@link Session} for every downstream procedure. Identity alone says
 * nothing about *what* the caller may do — pair this with a role/ownership guard
 * for any action that targets a specific resource (see `auth-and-access-control.mdc`).
 *
 * @throws {TRPCError} `UNAUTHORIZED` when there is no session.
 */
export const requireAuth = middleware(({ ctx, next }) => {
  if (ctx.session === null) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }
  // Re-attach the now non-null session so downstream `ctx.session` is typed
  // without an optional, removing the need to re-check it in every procedure.
  return next({ ctx: { session: ctx.session as Session } });
});

/**
 * Builds a guard that requires the caller's session role to be one of `roles`.
 * Role is always read from the server-side session, never from request input
 * (see `security.mdc`).
 *
 * This is necessary but, for resource-scoped actions, not sufficient on its own:
 * "is a `SOCIETY_ADMIN`" still needs "is the admin *of this* society" — that
 * ownership check lives in `require-society-ownership.ts` and runs after the
 * resource is loaded.
 *
 * @param roles - The roles permitted to proceed.
 * @returns A tRPC middleware that narrows `ctx.session` to non-null on success.
 * @throws {TRPCError} `UNAUTHORIZED` when unauthenticated, `FORBIDDEN` when the
 *   role is not permitted.
 */
export function requireRole(...roles: readonly UserRole[]) {
  return middleware(({ ctx, next }) => {
    if (ctx.session === null) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be signed in to perform this action.",
      });
    }
    if (!roles.includes(ctx.session.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This action requires one of these roles: ${roles.join(", ")}.`,
      });
    }
    return next({ ctx: { session: ctx.session as Session } });
  });
}

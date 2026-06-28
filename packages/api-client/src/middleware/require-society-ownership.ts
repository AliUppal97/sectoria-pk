import { TRPCError } from "@trpc/server";
import { UserRole } from "@sectoria/types";
import type { Session } from "../trpc.js";

/**
 * Resource-ownership guard: asserts that `session` belongs to the administrator
 * of the society identified by `societyId`.
 *
 * Why a plain function rather than a tRPC middleware: ownership depends on a
 * resource (the society/category/booking) that must be loaded from the database
 * *inside* the procedure first — the middleware layer doesn't know which input
 * field carries the owning society's id. So the procedure fetches the resource,
 * derives its `societyId`, and calls this guard. It throws on denial (never
 * returns a boolean the caller could forget to check — see
 * `auth-and-access-control.mdc`).
 *
 * A `SUPER_ADMIN` bypasses the ownership check by design — platform staff may
 * administer any society — but is still subject to having passed the role gate.
 *
 * @param session - The authenticated session (already role-gated).
 * @param societyId - The society the targeted resource belongs to.
 * @throws {TRPCError} `FORBIDDEN` when the caller does not own this society.
 */
export function assertSocietyOwnership(
  session: Session,
  societyId: string,
): void {
  if (session.user.role === UserRole.SUPER_ADMIN) {
    return;
  }
  if (
    session.user.role !== UserRole.SOCIETY_ADMIN ||
    session.user.societyId !== societyId
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not the administrator of this society.",
    });
  }
}

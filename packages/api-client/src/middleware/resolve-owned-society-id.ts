import { TRPCError } from "@trpc/server";
import { UserRole } from "@sectoria/types";
import type { Session } from "../trpc.js";

/**
 * Resolves which society a society-admin procedure may act on.
 *
 * A `SOCIETY_ADMIN` is always bound to `session.user.societyId` — any
 * `requestedSocietyId` that differs is rejected (the URL/query tampering case
 * from the portal test gate). A `SUPER_ADMIN` must pass an explicit id.
 *
 * @throws {TRPCError} `FORBIDDEN` when the caller cannot administer the society.
 * @throws {TRPCError} `BAD_REQUEST` when a super admin omits the society id.
 */
export function resolveOwnedSocietyId(
  session: Session,
  requestedSocietyId?: string,
): string {
  if (session.user.role === UserRole.SOCIETY_ADMIN) {
    const ownedId = session.user.societyId;
    if (ownedId === null || ownedId === undefined) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your account is not linked to a society.",
      });
    }
    if (
      requestedSocietyId !== undefined &&
      requestedSocietyId !== ownedId
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not the administrator of this society.",
      });
    }
    return ownedId;
  }

  if (requestedSocietyId === undefined) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "societyId is required for platform administrators.",
    });
  }
  return requestedSocietyId;
}

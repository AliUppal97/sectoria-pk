import "server-only";
import { prisma } from "@sectoria/database";
import { idSchema } from "@sectoria/types";
import type { Session } from "@sectoria/api-client";

/**
 * Builds the tRPC {@link Session} from an authenticated user id by reading the
 * caller's *current* role and verification state straight from the database.
 *
 * This is deliberate: the JWT carries role/`nadraVerified` claims for coarse
 * edge-middleware routing, but those can go stale (e.g. the moment after a buyer
 * completes NADRA verification mid-flow, before any re-login). Money-moving
 * procedures gate on `nadraVerified`, so the authoritative value must be the
 * live database row, never a token claim — per `auth-and-access-control.mdc`
 * ("never trust a role/permission claim … always re-derive from session
 * server-side") and `security.mdc`.
 *
 * @param userId - The authenticated user id from the Auth.js session, if any.
 * @returns A populated session, or `null` for an anonymous/unknown caller.
 */
export async function sessionFromUserId(
  userId: string | undefined | null,
): Promise<Session | null> {
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, nadraVerified: true, societyId: true },
  });
  if (user === null) return null;

  return {
    user: {
      id: idSchema.parse(user.id),
      role: user.role,
      nadraVerified: user.nadraVerified,
      societyId: user.societyId ? idSchema.parse(user.societyId) : null,
    },
  };
}

import { UserRole } from "@sectoria/types";

/**
 * The home route each role lands on. Used by `middleware.ts` to send a
 * wrong-role visitor to *their own* portal rather than a generic "access
 * denied" dead end (routing-and-navigation.mdc), and by the login flow to
 * pick a default post-sign-in destination.
 *
 * Kept here (a tiny, dependency-free module) so it can be imported into the
 * edge middleware without dragging in anything Node-only.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  [UserRole.BUYER]: "/dashboard",
  [UserRole.SOCIETY_ADMIN]: "/society-portal",
  [UserRole.DEALER_PARTNER]: "/dealer-portal",
  [UserRole.SALES_ADVISOR]: "/ops-portal",
  [UserRole.SUPER_ADMIN]: "/admin",
};

/** The route-group prefix each role is permitted to enter. */
export const ROLE_ROUTE_PREFIX: Record<UserRole, string> = ROLE_HOME;

/** Coarse route-group gates — shared with middleware and the login callback resolver. */
export const PROTECTED_ROUTE_PREFIXES: ReadonlyArray<{
  prefix: string;
  roles: readonly UserRole[];
}> = [
  { prefix: "/dashboard", roles: [UserRole.BUYER] },
  { prefix: "/society-portal", roles: [UserRole.SOCIETY_ADMIN] },
  { prefix: "/dealer-portal", roles: [UserRole.DEALER_PARTNER] },
  {
    prefix: "/ops-portal",
    roles: [UserRole.SALES_ADVISOR, UserRole.SUPER_ADMIN],
  },
  { prefix: "/admin", roles: [UserRole.SUPER_ADMIN] },
];

/** Whether a role may enter a path (mirrors middleware.ts coarse gating). */
export function canAccessPath(
  role: UserRole | undefined,
  pathname: string,
): boolean {
  if (role === UserRole.SUPER_ADMIN) return true;
  const match = PROTECTED_ROUTE_PREFIXES.find((entry) =>
    pathname.startsWith(entry.prefix),
  );
  if (match === undefined) return true;
  return role !== undefined && match.roles.includes(role);
}

/** The home path for a role, falling back to the buyer dashboard. */
export function homeForRole(role: UserRole | undefined): string {
  if (role === undefined) return ROLE_HOME[UserRole.BUYER];
  return ROLE_HOME[role] ?? ROLE_HOME[UserRole.BUYER];
}

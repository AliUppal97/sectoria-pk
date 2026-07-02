import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { UserRole } from "@sectoria/types";
import { authConfig } from "@/auth.config";
import { homeForRole, PROTECTED_ROUTE_PREFIXES } from "@/lib/auth/roles";

/**
 * Route-group gating — the coarse, first-line authorization check
 * (middleware-and-guards.mdc). It only asks "is there a session, and is its
 * role allowed in this route group?". Resource-level ownership ("is this the
 * buyer who owns *this* booking?") is enforced later, in the tRPC procedures —
 * middleware can't know about ownership and never tries to.
 *
 * Behaviour follows routing-and-navigation.mdc:
 *  - unauthenticated → redirect to /login with the intended path as callbackUrl
 *  - wrong role → redirect to that role's *own* portal, not a dead-end 403
 */
const { auth } = NextAuth(authConfig);

/** The role each protected route-group prefix requires. */
const PROTECTED_PREFIXES = PROTECTED_ROUTE_PREFIXES;

export default auth((req) => {
  const { nextUrl } = req;
  const match = PROTECTED_PREFIXES.find((entry) =>
    nextUrl.pathname.startsWith(entry.prefix),
  );

  // Not a gated route — let it through.
  if (match === undefined) return NextResponse.next();

  const session = req.auth;

  // Unauthenticated: send to login, preserving where they were headed.
  if (session === null || session.user === undefined) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set(
      "callbackUrl",
      `${nextUrl.pathname}${nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role;

  if (role === UserRole.SUPER_ADMIN) {
    return NextResponse.next();
  }

  if (role === undefined || !match.roles.includes(role)) {
    return NextResponse.redirect(new URL(homeForRole(role ?? UserRole.BUYER), nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/society-portal/:path*",
    "/dealer-portal/:path*",
    "/ops-portal/:path*",
    "/admin/:path*",
  ],
};

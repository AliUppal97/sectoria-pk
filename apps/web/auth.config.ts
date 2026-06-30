import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@sectoria/types";

/**
 * Edge-safe Auth.js v5 configuration.
 *
 * This object holds everything `middleware.ts` needs to read a session from the
 * JWT cookie at the edge: the session strategy, the sign-in page, and the
 * jwt/session callbacks that carry the identity claims. It deliberately defines
 * **no providers** here — the phone-OTP Credentials provider needs the Node
 * runtime (it touches Prisma) and is added in `auth.ts`, which composes this
 * config. Keeping the provider out of this file is what lets the middleware
 * bundle stay edge-compatible (Auth.js split-config pattern).
 *
 * The token carries `role`/`nadraVerified`/`societyId` only for *coarse*
 * middleware routing. Authorization that actually moves money or data is always
 * re-derived from the database in the tRPC context (see `lib/trpc/context.ts`),
 * never trusted from these claims — per `auth-and-access-control.mdc`.
 */
export const authConfig = {
  // A dev fallback so the app boots when AUTH_SECRET is unset locally. In
  // production Auth.js requires a real secret and will refuse to start without
  // one, which is the desired fail-loud behaviour.
  secret: process.env.AUTH_SECRET || "sectoria-dev-insecure-secret-change-me",
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // `user` is only present on initial sign-in. Persist the identity claims
      // onto the token so subsequent requests (and the edge middleware) can read
      // them without a database round-trip.
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: UserRole }).role;
        token.nadraVerified = (user as { nadraVerified?: boolean }).nadraVerified;
        token.societyId = (user as { societyId?: string | null }).societyId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = token.role as UserRole | undefined;
        session.user.nadraVerified =
          (token.nadraVerified as boolean | undefined) ?? false;
        session.user.societyId =
          (token.societyId as string | null | undefined) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

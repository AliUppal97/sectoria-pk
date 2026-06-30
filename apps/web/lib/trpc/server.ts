import "server-only";
import { cache } from "react";
import {
  appRouter,
  createCallerFactory,
  createTRPCContext,
} from "@sectoria/api-client";
import { prisma } from "@sectoria/database";
import { createVerificationAdapters } from "@sectoria/verification";
import { auth } from "@/auth";
import { getRateLimiter } from "@/lib/rate-limit";
import { sessionFromUserId } from "./context";

/**
 * Server-side tRPC access for React Server Components.
 *
 * Pages call the router *in-process* via the caller factory rather than over
 * HTTP — no network hop, no client bundle weight, and full type inference.
 * Verification adapters resolve to mocks automatically when their env
 * credentials are blank.
 *
 * Client-side mutations (the booking wizard's NADRA/tax/payment steps) instead
 * go through the HTTP route handler at `app/api/trpc/[trpc]/route.ts`, wired to
 * the React Query client in `lib/trpc/react.tsx`.
 */
const createCaller = createCallerFactory(appRouter);

/**
 * Anonymous caller for public (marketplace) Server Components. `session` is
 * `null`: those pages are public. Wrapped in React's `cache` so a single render
 * reuses one caller across all components that fetch during that request.
 */
export const getApi = cache(() =>
  createCaller(
    createTRPCContext({
      session: null,
      db: prisma,
      verification: createVerificationAdapters(),
      rateLimiter: getRateLimiter(),
    }),
  ),
);

/**
 * Authenticated caller for buyer/portal Server Components. Resolves the Auth.js
 * session and rebuilds the tRPC session from the live database row (see
 * {@link sessionFromUserId}) so protected reads always see the caller's current
 * role and verification state, never a stale token claim. `cache`d per request.
 */
export const getAuthedApi = cache(async () => {
  const authSession = await auth();
  const session = await sessionFromUserId(authSession?.user?.id);
  return createCaller(
    createTRPCContext({
      session,
      db: prisma,
      verification: createVerificationAdapters(),
      rateLimiter: getRateLimiter(),
    }),
  );
});

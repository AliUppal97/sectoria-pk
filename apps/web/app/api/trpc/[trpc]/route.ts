import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@sectoria/api-client";
import { prisma } from "@sectoria/database";
import { createVerificationAdapters } from "@sectoria/verification";
import { auth } from "@/auth";
import { getRateLimiter } from "@/lib/rate-limit";
import { sessionFromUserId } from "@/lib/trpc/context";

/**
 * tRPC HTTP endpoint for client-side calls (the booking wizard's mutations:
 * NADRA verify, ATL check, booking create). Server Components keep using the
 * in-process caller in `lib/trpc/server.ts`; this handler exists for the
 * interactive client surface.
 *
 * The session is rebuilt from the live database row (not the JWT claim) so
 * money-gating procedures (`verifiedBuyerProcedure`) see the caller's current
 * NADRA status — see `lib/trpc/context.ts`.
 */
async function handler(req: Request): Promise<Response> {
  const authSession = await auth();
  const session = await sessionFromUserId(authSession?.user?.id);

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        session,
        db: prisma,
        verification: createVerificationAdapters(),
        rateLimiter: getRateLimiter(),
        // Pre-auth abuse is keyed on IP; post-auth limits key on the user id.
        clientId: req.headers.get("x-forwarded-for") ?? null,
      }),
  });
}

export { handler as GET, handler as POST };

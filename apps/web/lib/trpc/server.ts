import "server-only";
import { cache } from "react";
import {
  appRouter,
  createCallerFactory,
  createTRPCContext,
} from "@sectoria/api-client";
import { prisma } from "@sectoria/database";
import { createVerificationAdapters } from "@sectoria/verification";

/**
 * Server-side tRPC access for React Server Components.
 *
 * The public marketplace is read-only and rendered on the server (SSR/ISR), so
 * it calls the router *in-process* via the caller factory rather than over HTTP
 * — no network hop, no client bundle weight, and full type inference. The HTTP
 * route handler and a React Query client provider are intentionally deferred to
 * the buyer-dashboard session, where authenticated client-side mutations first
 * appear (see api-trpc.mdc on the composition root being the only data path).
 *
 * `session` is `null` here: these pages are anonymous and public. Verification
 * adapters resolve to mocks automatically when their env credentials are blank.
 */
const createCaller = createCallerFactory(appRouter);

/**
 * Returns a tRPC caller bound to a fresh request context. Wrapped in React's
 * `cache` so a single render reuses one caller (and one set of verification
 * adapters) across all the components that fetch during that request.
 */
export const getApi = cache(() =>
  createCaller(
    createTRPCContext({
      session: null,
      db: prisma,
      verification: createVerificationAdapters(),
    }),
  ),
);

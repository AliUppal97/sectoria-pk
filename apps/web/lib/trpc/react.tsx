"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState, type ReactNode } from "react";
import type { AppRouter } from "@sectoria/api-client";

/**
 * The typed tRPC React client. Procedure hooks (`api.booking.create.useMutation`,
 * `api.verification.verifyCnic.useMutation`, …) are fully inferred from
 * {@link AppRouter} — one schema change in `@sectoria/api-client` surfaces as a
 * compile error at every stale call site here.
 */
export const api = createTRPCReact<AppRouter>();

/**
 * A plain (non-hook) tRPC client for the browser. Used where the React Query
 * hook generics would otherwise instantiate an excessively deep type on a very
 * large sub-router (TS2589) — pair it with TanStack Query's own `useQuery` and
 * keep full end-to-end type inference on the call itself.
 */
export const trpcVanilla = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/trpc" })],
});

/**
 * Provides the tRPC + React Query clients to the client components beneath it.
 * Mounted in the authenticated `(buyer)` layout — the public marketplace stays
 * server-rendered and doesn't carry this bundle.
 *
 * No data transformer is configured, matching the server (`initTRPC` in
 * `@sectoria/api-client` uses none); the wire shape is plain JSON.
 */
export function TRPCReactProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    api.createClient({
      // A relative URL resolves against the current origin in the browser.
      links: [httpBatchLink({ url: "/api/trpc" })],
    }),
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  );
}

import { TRPCError } from "@sectoria/api-client";

/**
 * The result of a server-side data load, modelling the five UI states the
 * marketplace must handle (ui-ux-excellence.mdc). `success`/`error` are the two
 * a fetch itself can produce; the loading, empty, and partial states are
 * decided by the rendering component from the data (or its absence).
 */
export type Loaded<T> =
  | { readonly status: "success"; readonly data: T }
  | { readonly status: "error" };

/**
 * Runs a data load and never throws: a failure becomes an `error` result so the
 * page can render a recoverable error state instead of crashing the render
 * (which would also fail static generation). NOT_FOUND is deliberately *not*
 * swallowed here — profile pages re-check with {@link isNotFound} to serve a
 * proper 404 via `notFound()`.
 */
export async function load<T>(fn: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { status: "success", data: await fn() };
  } catch (error) {
    if (isNotFound(error)) throw error;
    if (process.env.NODE_ENV !== "production") {
      console.error("[marketplace] data load failed:", error);
    }
    return { status: "error" };
  }
}

/** True when a thrown error is a tRPC NOT_FOUND — the signal to serve a 404. */
export function isNotFound(error: unknown): boolean {
  return error instanceof TRPCError && error.code === "NOT_FOUND";
}

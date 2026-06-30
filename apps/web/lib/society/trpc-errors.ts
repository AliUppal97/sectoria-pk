import { TRPCError } from "@sectoria/api-client";
import { forbidden } from "next/navigation";

/** Detects a tRPC `FORBIDDEN` error from the in-process server caller. */
export function isForbiddenError(error: unknown): boolean {
  return error instanceof TRPCError && error.code === "FORBIDDEN";
}

/**
 * Renders Next.js's forbidden boundary when a society-admin procedure denies
 * access (e.g. URL tampering with another society's id).
 */
export function denyIfForbidden(error: unknown): never {
  if (isForbiddenError(error)) {
    forbidden();
  }
  throw error;
}

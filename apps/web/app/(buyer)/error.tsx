"use client";

import { useEffect } from "react";
import { ErrorState } from "@sectoria/ui";

/**
 * Error boundary for the buyer portal. A failed Server Component data load lands
 * here with a human-readable message and a retry path (the five-states rule —
 * never a blank or raw error).
 */
export default function BuyerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[buyer] page error:", error);
    }
  }, [error]);

  return (
    <div className="py-12">
      <ErrorState
        title="We couldn't load this page"
        message="Something went wrong while loading your dashboard. Please try again — if it keeps happening, contact support."
        onRetry={reset}
        supportHref="/support"
      />
    </div>
  );
}

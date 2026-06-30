"use client";

import { useEffect } from "react";
import { ErrorState } from "@sectoria/ui";

/** Error boundary for the dealer portal. */
export default function DealerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[dealer] page error:", error);
    }
  }, [error]);

  return (
    <div className="py-12">
      <ErrorState
        title="We couldn't load this page"
        message="Something went wrong while loading the dealer portal. Please try again — if it keeps happening, contact support."
        onRetry={reset}
        supportHref="/support"
      />
    </div>
  );
}

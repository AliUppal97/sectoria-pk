"use client";

import { ErrorState } from "@sectoria/ui";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Something went wrong in the admin portal"
      message={
        error.message ||
        "We couldn't load this page. Try again or contact engineering if the problem persists."
      }
      onRetry={reset}
    />
  );
}

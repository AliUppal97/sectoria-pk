"use client";

import { useState } from "react";
import { Button, Input } from "@sectoria/ui";
import { api } from "@/lib/trpc/react";

export function RemittanceActions({ quoteId }: { quoteId: string }) {
  const [reason, setReason] = useState("Dealer net remitted via bank transfer");
  const record = api.quote.recordRemittance.useMutation();
  const utils = api.useUtils();

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void record
          .mutateAsync({ quoteId, reason })
          .then(() => void utils.quote.listPendingRemittance.invalidate());
      }}
    >
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        aria-label="Remittance reason"
        className="min-w-[220px]"
      />
      <Button type="submit" size="sm" disabled={record.isPending}>
        Record remittance
      </Button>
    </form>
  );
}

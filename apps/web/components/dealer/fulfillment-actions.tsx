"use client";

import { useState } from "react";
import { Button, Input } from "@sectoria/ui";
import { api } from "@/lib/trpc/react";

export function FulfillmentActions({
  orderId,
  orderRef,
}: {
  orderId: string;
  orderRef: string;
}) {
  const [plotRef, setPlotRef] = useState("");
  const markAllocated = api.fulfillment.markAllocated.useMutation();

  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void markAllocated.mutateAsync({ orderId, plotRef });
      }}
    >
      <div>
        <label htmlFor={`plot-${orderId}`} className="font-sans text-xs font-medium">
          Plot reference for {orderRef}
        </label>
        <Input
          id={`plot-${orderId}`}
          value={plotRef}
          onChange={(e) => setPlotRef(e.target.value)}
          placeholder="e.g. Block C Plot 145"
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={markAllocated.isPending}>
        Mark allocated
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { Button, Input, formatPKR } from "@sectoria/ui";
import { api } from "@/lib/trpc/react";

export function DealerNetSheetForm({
  authorizedCategories,
}: {
  authorizedCategories: Array<{
    id: string;
    label: string;
    currentNetPkr: number | null;
  }>;
}) {
  const [categoryId, setCategoryId] = useState(authorizedCategories[0]?.id ?? "");
  const [netPrice, setNetPrice] = useState(
    authorizedCategories[0]?.currentNetPkr
      ? String(authorizedCategories[0].currentNetPkr)
      : "",
  );

  const upsert = api.dealerNetSheet.upsert.useMutation();

  return (
    <form
      className="max-w-md space-y-4 rounded-xl border border-border-base bg-surface-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void upsert.mutateAsync({
          categoryId,
          netPricePkr: Number.parseInt(netPrice.replace(/,/g, ""), 10),
        });
      }}
    >
      <div>
        <label htmlFor="category" className="font-sans text-sm font-medium">
          Category
        </label>
        <select
          id="category"
          className="mt-1 w-full rounded-lg border border-border-base px-3 py-2 text-sm"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {authorizedCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
              {cat.currentNetPkr ? ` · ${formatPKR(cat.currentNetPkr)}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="net" className="font-sans text-sm font-medium">
          Net price (PKR)
        </label>
        <Input id="net" value={netPrice} onChange={(e) => setNetPrice(e.target.value)} />
      </div>
      <Button type="submit" disabled={upsert.isPending}>
        {upsert.isPending ? "Saving…" : "Update net sheet"}
      </Button>
      {upsert.isSuccess ? (
        <p className="font-sans text-sm text-text-success">Saved.</p>
      ) : null}
    </form>
  );
}

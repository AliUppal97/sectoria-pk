"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, formatPKR } from "@sectoria/ui";
import { api } from "@/lib/trpc/react";

interface MatrixRow {
  id: string;
  societyId: string;
  categoryId: string;
  dealerId: string;
  netPricePkr: number;
  dealerAgencyName: string;
  societyName: string;
  categoryLabel: string;
  listPricePkr: number;
}

export function QuoteBuilderForm({
  leadId,
  matrix,
}: {
  leadId: string;
  matrix: MatrixRow[];
}) {
  const router = useRouter();
  const [selectedSheetId, setSelectedSheetId] = useState(matrix[0]?.id ?? "");
  const [quotedPrice, setQuotedPrice] = useState(
    matrix[0] ? String(matrix[0].netPricePkr + 200_000) : "",
  );
  const [tokenAmount, setTokenAmount] = useState(
    matrix[0] ? String(Math.round(matrix[0].netPricePkr * 0.1)) : "",
  );

  const selected = useMemo(
    () => matrix.find((row) => row.id === selectedSheetId) ?? null,
    [matrix, selectedSheetId],
  );

  const createDraft = api.quote.createDraft.useMutation();
  const sendQuote = api.quote.send.useMutation();

  const spread =
    selected && quotedPrice
      ? Number.parseInt(quotedPrice.replace(/,/g, ""), 10) - selected.netPricePkr
      : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !leadId) return;

    const quotedPricePkr = Number.parseInt(quotedPrice.replace(/,/g, ""), 10);
    const tokenAmountPkr = Number.parseInt(tokenAmount.replace(/,/g, ""), 10);
    const validUntil = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const draft = await createDraft.mutateAsync({
      leadId,
      societyId: selected.societyId,
      categoryId: selected.categoryId,
      dealerId: selected.dealerId,
      dealerNetPkr: selected.netPricePkr,
      quotedPricePkr,
      tokenAmountPkr,
      validUntil,
    });

    await sendQuote.mutateAsync({ quoteId: draft.id });
    router.push(`/ops-portal/leads/${leadId}`);
    router.refresh();
  }

  if (!leadId) {
    return (
      <p className="font-sans text-sm text-text-secondary">
        Open this page from a lead to create a quote.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="max-w-xl space-y-4 rounded-xl border border-border-base bg-surface-card p-6"
    >
      <div>
        <label htmlFor="sheet" className="font-sans text-sm font-medium">
          Dealer net option
        </label>
        <select
          id="sheet"
          className="mt-1 w-full rounded-lg border border-border-base px-3 py-2 font-sans text-sm"
          value={selectedSheetId}
          onChange={(e) => {
            setSelectedSheetId(e.target.value);
            const row = matrix.find((r) => r.id === e.target.value);
            if (row) {
              setQuotedPrice(String(row.netPricePkr + 200_000));
              setTokenAmount(String(Math.round((row.netPricePkr + 200_000) * 0.1)));
            }
          }}
        >
          {matrix.map((row) => (
            <option key={row.id} value={row.id}>
              {row.societyName} · {row.categoryLabel} · {row.dealerAgencyName} ·{" "}
              {formatPKR(row.netPricePkr)}
            </option>
          ))}
        </select>
      </div>

      {selected ? (
        <p className="font-sans text-sm text-text-secondary">
          List price {formatPKR(selected.listPricePkr)} · Dealer net{" "}
          {formatPKR(selected.netPricePkr)}
        </p>
      ) : null}

      <div>
        <label htmlFor="quoted" className="font-sans text-sm font-medium">
          Customer quote (PKR)
        </label>
        <Input
          id="quoted"
          value={quotedPrice}
          onChange={(e) => setQuotedPrice(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="token" className="font-sans text-sm font-medium">
          Token amount (PKR)
        </label>
        <Input
          id="token"
          value={tokenAmount}
          onChange={(e) => setTokenAmount(e.target.value)}
          required
        />
      </div>

      {spread !== null && spread >= 0 ? (
        <p className="font-sans text-sm text-text-primary">
          Sectoria spread: {formatPKR(spread)}
        </p>
      ) : (
        <p className="font-sans text-sm text-text-danger">
          Quote must be above dealer net.
        </p>
      )}

      <Button type="submit" disabled={createDraft.isPending || sendQuote.isPending}>
        Send quote to customer
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LeadStatus, QuoteStatus } from "@sectoria/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  formatPKR,
} from "@sectoria/ui";
import { api } from "@/lib/trpc/react";

export interface OpsQuoteRow {
  id: string;
  quotedPricePkr: number;
  status: string;
  tokenPaid: boolean;
  installmentsDirect: boolean;
}

/**
 * Ops action to close a concierge deal after token payment — confirm dialog
 * required for installment routing (ui-ux-excellence-sectoria.mdc).
 */
export function MarkDealWonAction({
  leadId,
  leadStatus,
  quotes,
}: {
  leadId: string;
  leadStatus: string;
  quotes: OpsQuoteRow[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [installmentsDirect, setInstallmentsDirect] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eligibleQuote = quotes.find(
    (quote) =>
      quote.status === QuoteStatus.ACCEPTED && quote.tokenPaid,
  );

  const markWon = api.quote.markDealWon.useMutation({
    onSuccess: () => {
      setDialogOpen(false);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  if (leadStatus === LeadStatus.WON) {
    const closedQuote = quotes.find(
      (quote) => quote.status === QuoteStatus.ACCEPTED,
    );
    return (
      <div
        className="rounded-lg border border-success-border bg-success-bg p-4"
        aria-live="polite"
      >
        <p className="font-sans text-sm font-semibold text-success-text">
          Deal closed — lead marked won
        </p>
        <p className="mt-1 font-sans text-xs text-text-secondary">
          {closedQuote?.installmentsDirect
            ? "Future installments are collected directly by the society or authorized dealer (Option A)."
            : "Future installments are collected on Sectoria (Option B)."}
        </p>
      </div>
    );
  }

  if (eligibleQuote === undefined) {
    return null;
  }

  function openDialog() {
    setError(null);
    setDialogOpen(true);
  }

  return (
    <>
      <Button onClick={openDialog}>Mark deal won</Button>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!markWon.isPending) {
            setDialogOpen(open);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark deal as won</DialogTitle>
            <DialogDescription>
              This closes the deal for{" "}
              {formatPKR(eligibleQuote.quotedPricePkr)} and records how future
              installments will be collected. This cannot be undone from this
              screen.
            </DialogDescription>
          </DialogHeader>

          <fieldset className="space-y-3">
            <legend className="font-sans text-sm font-medium text-text-primary">
              Installment collection
            </legend>

            <label className="flex cursor-pointer gap-3 rounded-lg border border-border-base p-3 has-checked:border-brand-navy has-checked:bg-surface-subtle">
              <input
                type="radio"
                name="installmentsDirect"
                checked={installmentsDirect}
                onChange={() => setInstallmentsDirect(true)}
                className="mt-0.5"
              />
              <span className="font-sans text-sm">
                <span className="font-medium text-text-primary">
                  Option A — Direct to society/dealer
                </span>
                <span className="mt-0.5 block text-xs text-text-secondary">
                  Buyer pays the society or authorized dealer off-platform for
                  remaining installments.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer gap-3 rounded-lg border border-border-base p-3 has-checked:border-brand-navy has-checked:bg-surface-subtle">
              <input
                type="radio"
                name="installmentsDirect"
                checked={!installmentsDirect}
                onChange={() => setInstallmentsDirect(false)}
                className="mt-0.5"
              />
              <span className="font-sans text-sm">
                <span className="font-medium text-text-primary">
                  Option B — On Sectoria
                </span>
                <span className="mt-0.5 block text-xs text-text-secondary">
                  Buyer pays remaining installments through Sectoria on-platform.
                </span>
              </span>
            </label>
          </fieldset>

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-danger-border bg-danger-bg p-3 font-sans text-xs text-danger-text"
            >
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={markWon.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              disabled={markWon.isPending}
              onClick={() => {
                setError(null);
                markWon.mutate({ leadId, installmentsDirect });
              }}
            >
              {markWon.isPending ? "Processing…" : "Confirm & close deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

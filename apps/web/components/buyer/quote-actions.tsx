"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuoteStatus, type QuoteInstallmentScheduleRow } from "@sectoria/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  StatusBadge,
  formatDate,
  formatPKR,
} from "@sectoria/ui";
import { api } from "@/lib/trpc/react";

export interface BuyerQuoteRow {
  id: string;
  quotedPricePkr: number;
  tokenAmountPkr: number;
  validUntil: string;
  status: string;
  paymentPlanLabel: string | null;
  installmentsDirect: boolean;
  tokenPaid: boolean;
  installmentsPaidPkr: number;
  installmentSchedule: readonly QuoteInstallmentScheduleRow[];
  nextInstallmentIndex: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  [QuoteStatus.SENT]: "Awaiting your response",
  [QuoteStatus.ACCEPTED]: "Accepted",
  [QuoteStatus.EXPIRED]: "Expired",
  [QuoteStatus.CANCELLED]: "Cancelled",
};

export function QuoteActions({ quote }: { quote: BuyerQuoteRow }) {
  const router = useRouter();
  const utils = api.useUtils();
  const [optimistic, setOptimistic] = useState<{
    status?: string;
    tokenPaid?: boolean;
  }>({});

  const status = optimistic.status ?? quote.status;
  const tokenPaid = optimistic.tokenPaid ?? quote.tokenPaid;

  const refreshQuotes = () => {
    void utils.quote.listForBuyer.invalidate();
    router.refresh();
  };
  const accept = api.quote.accept.useMutation({
    onSuccess: () => {
      setOptimistic((prev) => ({ ...prev, status: QuoteStatus.ACCEPTED }));
      refreshQuotes();
    },
  });
  const payToken = api.quote.payToken.useMutation({
    onSuccess: () => {
      setOptimistic((prev) => ({ ...prev, tokenPaid: true }));
      refreshQuotes();
    },
  });
  const payInstallment = api.quote.payInstallment.useMutation({
    onSuccess: refreshQuotes,
  });

  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [installmentDialogOpen, setInstallmentDialogOpen] = useState(false);

  const canAccept = status === QuoteStatus.SENT;
  const canPayToken = status === QuoteStatus.ACCEPTED && !tokenPaid;
  const nextInstallment =
    quote.nextInstallmentIndex !== null
      ? quote.installmentSchedule.find(
          (row) => row.index === quote.nextInstallmentIndex,
        )
      : undefined;
  const showSchedule =
    tokenPaid && !quote.installmentsDirect && quote.installmentSchedule.length > 0;
  const canPayInstallment = showSchedule && nextInstallment !== undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge variant={tokenPaid ? "success" : "info"}>
          {tokenPaid
            ? "Token paid"
            : (STATUS_LABEL[status] ?? status)}
        </StatusBadge>
        <span className="font-mono text-sm font-semibold text-text-primary">
          {formatPKR(quote.quotedPricePkr)}
        </span>
      </div>

      {quote.paymentPlanLabel ? (
        <p className="font-sans text-xs text-text-secondary">
          {quote.paymentPlanLabel}
          {quote.installmentsDirect ? " (direct to society)" : ""}
        </p>
      ) : null}

      {tokenPaid ? (
        <p className="font-sans text-sm text-text-secondary">
          Sectoria is coordinating allocation with the authorized dealer. We will
          contact you when your plot reference is confirmed.
        </p>
      ) : null}

      {showSchedule ? (
        <div className="rounded-lg border border-border-base bg-surface-subtle/40 p-3">
          <p className="font-sans text-xs font-medium text-text-secondary">
            Installment schedule
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {quote.installmentSchedule.map((row) => (
              <li
                key={row.index}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-sans text-text-primary">{row.dueLabel}</p>
                  <p className="font-sans text-xs text-text-tertiary">
                    Due {formatDate(row.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-text-primary">
                    {formatPKR(row.amountPkr)}
                  </span>
                  <StatusBadge
                    variant={row.status === "PAID" ? "success" : "warning"}
                  >
                    {row.status === "PAID" ? "Paid" : "Pending"}
                  </StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canAccept ? (
          <Button
            size="sm"
            disabled={accept.isPending}
            onClick={() => void accept.mutateAsync({ quoteId: quote.id })}
          >
            Accept quote
          </Button>
        ) : null}

        {canPayToken ? (
          <>
            <Button size="sm" onClick={() => setTokenDialogOpen(true)}>
              Pay booking token
            </Button>
            <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm booking token payment</DialogTitle>
                  <DialogDescription>
                    You are paying {formatPKR(quote.tokenAmountPkr)} to reserve
                    this plot on-platform. Sectoria will coordinate with the
                    authorized dealer — your contact details are not shared
                    with the dealer.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setTokenDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={payToken.isPending}
                    onClick={() => {
                      void payToken
                        .mutateAsync({ quoteId: quote.id })
                        .then(() => setTokenDialogOpen(false));
                    }}
                  >
                    Confirm & pay {formatPKR(quote.tokenAmountPkr)}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}

        {canPayInstallment && nextInstallment !== undefined ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setInstallmentDialogOpen(true)}
            >
              Pay next installment
            </Button>
            <Dialog
              open={installmentDialogOpen}
              onOpenChange={setInstallmentDialogOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm installment payment</DialogTitle>
                  <DialogDescription>
                    You are paying {formatPKR(nextInstallment.amountPkr)} for{" "}
                    {nextInstallment.dueLabel} on-platform. Paid so far:{" "}
                    {formatPKR(quote.installmentsPaidPkr)}.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setInstallmentDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={payInstallment.isPending}
                    onClick={() => {
                      void payInstallment
                        .mutateAsync({
                          quoteId: quote.id,
                          installmentIndex: nextInstallment.index,
                        })
                        .then(() => setInstallmentDialogOpen(false));
                    }}
                  >
                    Confirm & pay {formatPKR(nextInstallment.amountPkr)}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}
      </div>
    </div>
  );
}

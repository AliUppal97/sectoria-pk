"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QuoteStatus } from "@sectoria/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  StatusBadge,
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
  const [status, setStatus] = useState(quote.status);
  const [tokenPaid, setTokenPaid] = useState(quote.tokenPaid);

  useEffect(() => {
    setStatus(quote.status);
    setTokenPaid(quote.tokenPaid);
  }, [quote.status, quote.tokenPaid]);

  const refreshQuotes = () => {
    void utils.quote.listForBuyer.invalidate();
    router.refresh();
  };
  const accept = api.quote.accept.useMutation({
    onSuccess: () => {
      setStatus(QuoteStatus.ACCEPTED);
      refreshQuotes();
    },
  });
  const payToken = api.quote.payToken.useMutation({
    onSuccess: () => {
      setTokenPaid(true);
      refreshQuotes();
    },
  });
  const payInstallment = api.quote.payInstallment.useMutation({
    onSuccess: refreshQuotes,
  });

  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [installmentDialogOpen, setInstallmentDialogOpen] = useState(false);
  const [installmentAmount, setInstallmentAmount] = useState("");

  const canAccept = status === QuoteStatus.SENT;
  const canPayToken = status === QuoteStatus.ACCEPTED && !tokenPaid;
  const canPayInstallment =
    status === QuoteStatus.ACCEPTED && tokenPaid && !quote.installmentsDirect;

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

        {canPayInstallment ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setInstallmentDialogOpen(true)}
            >
              Pay installment
            </Button>
            <Dialog
              open={installmentDialogOpen}
              onOpenChange={setInstallmentDialogOpen}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Pay installment on platform</DialogTitle>
                  <DialogDescription>
                    Enter the installment amount shown on your payment schedule.
                    Paid so far: {formatPKR(quote.installmentsPaidPkr)}.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  type="number"
                  min={1}
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value)}
                  placeholder="Amount in PKR"
                />
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
                      const amountPkr = Number.parseInt(installmentAmount, 10);
                      if (!Number.isFinite(amountPkr) || amountPkr <= 0) return;
                      void payInstallment
                        .mutateAsync({
                          quoteId: quote.id,
                          installmentIndex: 0,
                          amountPkr,
                        })
                        .then(() => setInstallmentDialogOpen(false));
                    }}
                  >
                    Confirm payment
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

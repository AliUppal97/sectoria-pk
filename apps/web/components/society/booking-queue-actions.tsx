"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { EscrowAction, EscrowState, type EscrowState as EscrowStateType } from "@sectoria/types";
import { api } from "@/lib/trpc/react";

interface BookingQueueActionsProps {
  bookingId: string;
  status: EscrowStateType;
  amountPkr: number;
  buyerName: string;
}

/**
 * Society-side booking actions with confirm dialogs for every money-moving step
 * (ui-ux-excellence-sectoria.mdc — never a toast for payment confirmation).
 */
export function BookingQueueActions({
  bookingId,
  status,
  amountPkr,
  buyerName,
}: BookingQueueActionsProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<
    "allocate" | "installment" | "documents" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const allocateMutation = api.booking.allocate.useMutation({
    onSuccess: () => {
      setDialog(null);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const advanceMutation = api.booking.advance.useMutation({
    onSuccess: () => {
      setDialog(null);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const isPending = allocateMutation.isPending || advanceMutation.isPending;

  function confirmAction() {
    setError(null);
    if (dialog === "allocate") {
      allocateMutation.mutate({ bookingId });
      return;
    }
    if (dialog === "installment") {
      advanceMutation.mutate({
        bookingId,
        action: EscrowAction.PAY_INSTALLMENT,
      });
      return;
    }
    if (dialog === "documents") {
      advanceMutation.mutate({
        bookingId,
        action: EscrowAction.ISSUE_DOCUMENTS,
      });
    }
  }

  const dialogCopy = getDialogCopy(dialog, amountPkr, buyerName);

  return (
    <>
      {status === EscrowState.BOOKING_TOKEN_PAID ? (
        <Button size="sm" onClick={() => setDialog("allocate")}>
          Confirm receipt & allocate
        </Button>
      ) : null}
      {status === EscrowState.INSTALLMENT_DUE ? (
        <Button size="sm" onClick={() => setDialog("installment")}>
          Confirm installment
        </Button>
      ) : null}
      {status === EscrowState.FULLY_PAID ? (
        <Button size="sm" variant="success" onClick={() => setDialog("documents")}>
          Issue allotment document
        </Button>
      ) : null}

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogCopy?.title}</DialogTitle>
            <DialogDescription>{dialogCopy?.description}</DialogDescription>
          </DialogHeader>
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
              onClick={() => setDialog(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={confirmAction}
              disabled={isPending}
            >
              {isPending ? "Processing…" : dialogCopy?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getDialogCopy(
  dialog: "allocate" | "installment" | "documents" | null,
  amountPkr: number,
  buyerName: string,
) {
  const formatted = formatPKR(amountPkr);
  switch (dialog) {
    case "allocate":
      return {
        title: "Confirm booking token receipt",
        description: `You're confirming receipt of ${formatted} from ${buyerName} and allocating a plot. This records the payment in escrow and assigns inventory — it cannot be undone from this screen.`,
        confirmLabel: `Confirm ${formatted} received`,
      };
    case "installment":
      return {
        title: "Confirm installment receipt",
        description: `You're confirming receipt of ${formatted} from ${buyerName} for this booking's installment. This advances escrow and cannot be undone.`,
        confirmLabel: `Confirm ${formatted} received`,
      };
    case "documents":
      return {
        title: "Issue allotment document",
        description: `You're issuing the official allotment document for ${buyerName}'s fully paid booking (${formatted} total). This marks documents as issued in escrow and is permanently recorded.`,
        confirmLabel: "Issue document",
      };
    default:
      return null;
  }
}

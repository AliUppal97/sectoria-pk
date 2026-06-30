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
  Label,
  StatusBadge,
  cn,
} from "@sectoria/ui";
import { api } from "@/lib/trpc/react";

type ReviewTarget =
  | {
      kind: "society";
      id: string;
      name: string;
      city: string;
      authority: string;
    }
  | {
      kind: "dealer";
      id: string;
      agencyName: string;
      certNumber: string | null;
    };

type PendingAction = {
  target: ReviewTarget;
  decision: "APPROVE" | "REJECT";
};

interface VerificationReviewPanelProps {
  societies: readonly {
    id: string;
    name: string;
    city: string;
    authority: string;
    lopReferenceNo: string | null;
    nocReferenceNo: string | null;
  }[];
  dealers: readonly {
    id: string;
    agencyName: string;
    dnfbpCertNumber: string | null;
    user: { name: string; phone: string };
  }[];
}

/**
 * Approve/reject controls for the verification queue. Every action opens a
 * confirm dialog that requires a written reason (ui-ux-excellence-sectoria.mdc).
 */
export function VerificationReviewPanel({
  societies,
  dealers,
}: VerificationReviewPanelProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const societyMutation = api.admin.reviewSocietyVerification.useMutation({
    onSuccess: () => {
      setPending(null);
      setReason("");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const dealerMutation = api.admin.reviewDealerVerification.useMutation({
    onSuccess: () => {
      setPending(null);
      setReason("");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const isPending = societyMutation.isPending || dealerMutation.isPending;

  function openAction(target: ReviewTarget, decision: "APPROVE" | "REJECT") {
    setError(null);
    setReason("");
    setPending({ target, decision });
  }

  function confirmReview() {
    if (pending === null) return;
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      setError("Enter a reason before confirming — this is recorded in the audit ledger.");
      return;
    }

    setError(null);
    if (pending.target.kind === "society") {
      societyMutation.mutate({
        societyId: pending.target.id,
        decision: pending.decision,
        reason: trimmed,
      });
      return;
    }

    dealerMutation.mutate({
      dealerId: pending.target.id,
      decision: pending.decision,
      reason: trimmed,
    });
  }

  const dialogCopy =
    pending !== null ? getDialogCopy(pending.target, pending.decision) : null;

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="font-sans text-md font-semibold text-text-primary">
          Societies awaiting LOP/NOC review
        </h2>
        <p className="mt-1 font-sans text-sm text-text-secondary">
          Approve sets the verification tier to Verified (or HSMS-linked when
          applicable). Reject keeps the society pending and records your reason.
        </p>

        {societies.length === 0 ? (
          <p className="mt-4 rounded-lg border border-border-base bg-surface-card p-4 font-sans text-sm text-text-secondary">
            No societies are waiting for verification right now.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {societies.map((society) => (
              <li
                key={society.id}
                className="rounded-xl border border-border-base bg-surface-card p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-semibold text-text-primary">
                      {society.name}
                    </p>
                    <p className="font-sans text-xs text-text-tertiary">
                      {society.city} · {society.authority}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge variant="warning">Pending verification</StatusBadge>
                    </div>
                    <dl className="mt-3 grid gap-1 font-sans text-xs text-text-secondary sm:grid-cols-2">
                      <div>
                        <dt className="text-text-tertiary">LOP ref</dt>
                        <dd className="font-mono">
                          {society.lopReferenceNo ?? "Not submitted"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-text-tertiary">NOC ref</dt>
                        <dd className="font-mono">
                          {society.nocReferenceNo ?? "Not submitted"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() =>
                        openAction(
                          {
                            kind: "society",
                            id: society.id,
                            name: society.name,
                            city: society.city,
                            authority: society.authority,
                          },
                          "APPROVE",
                        )
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        openAction(
                          {
                            kind: "society",
                            id: society.id,
                            name: society.name,
                            city: society.city,
                            authority: society.authority,
                          },
                          "REJECT",
                        )
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-sans text-md font-semibold text-text-primary">
          Dealers awaiting DNFBP sign-off
        </h2>
        <p className="mt-1 font-sans text-sm text-text-secondary">
          Partners who submitted a certificate number but are not yet marked
          verified on the platform.
        </p>

        {dealers.length === 0 ? (
          <p className="mt-4 rounded-lg border border-border-base bg-surface-card p-4 font-sans text-sm text-text-secondary">
            No dealer certificates are waiting for review.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {dealers.map((dealer) => (
              <li
                key={dealer.id}
                className="rounded-xl border border-border-base bg-surface-card p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-semibold text-text-primary">
                      {dealer.agencyName}
                    </p>
                    <p className="font-sans text-xs text-text-tertiary">
                      {dealer.user.name} · {dealer.user.phone}
                    </p>
                    <p className="mt-2 font-mono text-xs text-text-secondary">
                      {dealer.dnfbpCertNumber ?? "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() =>
                        openAction(
                          {
                            kind: "dealer",
                            id: dealer.id,
                            agencyName: dealer.agencyName,
                            certNumber: dealer.dnfbpCertNumber,
                          },
                          "APPROVE",
                        )
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        openAction(
                          {
                            kind: "dealer",
                            id: dealer.id,
                            agencyName: dealer.agencyName,
                            certNumber: dealer.dnfbpCertNumber,
                          },
                          "REJECT",
                        )
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
            setReason("");
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogCopy?.title}</DialogTitle>
            <DialogDescription>{dialogCopy?.description}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-reason">Reason for audit log</Label>
            <textarea
              id="review-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Document why you are approving or rejecting this verification…"
              className={cn(
                "min-h-[80px] w-full resize-y rounded-md border border-border-base bg-surface-inset px-3 py-2 font-sans text-sm text-text-primary",
                "placeholder:text-text-tertiary focus-visible:border-border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/30",
              )}
            />
          </div>

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
              onClick={() => setPending(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant={pending?.decision === "APPROVE" ? "success" : "destructive"}
              onClick={confirmReview}
              disabled={isPending}
            >
              {isPending ? "Recording…" : dialogCopy?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getDialogCopy(target: ReviewTarget, decision: "APPROVE" | "REJECT") {
  if (target.kind === "society") {
    if (decision === "APPROVE") {
      return {
        title: `Approve ${target.name}?`,
        description: `This will mark ${target.name} (${target.city}) as verified on Sectoria and permanently record your decision in the audit ledger.`,
        confirmLabel: "Approve society",
      };
    }
    return {
      title: `Reject ${target.name}?`,
      description: `This keeps ${target.name} in pending verification and records your rejection reason in the audit ledger — buyers will not see it as verified.`,
      confirmLabel: "Reject society",
    };
  }

  if (decision === "APPROVE") {
    return {
      title: `Approve ${target.agencyName}?`,
      description: `This marks ${target.agencyName} as DNFBP-verified on the platform. Certificate ${target.certNumber ?? ""} will be trusted in the marketplace.`,
      confirmLabel: "Approve dealer",
    };
  }
  return {
    title: `Reject ${target.agencyName}?`,
    description: `This keeps ${target.agencyName} unverified and records your reason. Their certificate will not display as DNFBP-verified.`,
    confirmLabel: "Reject dealer",
  };
}

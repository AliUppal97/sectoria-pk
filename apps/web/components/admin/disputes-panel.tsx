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

interface PlotRow {
  id: string;
  serialNo: string;
  plotNo: string | null;
  bookingId: string | null;
  buyerName: string | null;
  categoryLabel: string;
  societyName: string;
  city: string;
  status?: string;
}

interface DisputesPanelProps {
  disputed: readonly PlotRow[];
  disputable: readonly PlotRow[];
}

type PendingDisputeAction =
  | { kind: "flag"; plot: PlotRow }
  | { kind: "resolve"; plot: PlotRow };

/**
 * Flag and resolve plot disputes. Both actions require a confirm dialog with a
 * mandatory reason that is written to the append-only audit ledger.
 */
export function DisputesPanel({ disputed, disputable }: DisputesPanelProps) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingDisputeAction | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const flagMutation = api.admin.flagPlotDispute.useMutation({
    onSuccess: () => {
      setPending(null);
      setReason("");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const resolveMutation = api.admin.resolvePlotDispute.useMutation({
    onSuccess: () => {
      setPending(null);
      setReason("");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const isPending = flagMutation.isPending || resolveMutation.isPending;

  function confirmAction() {
    if (pending === null) return;
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      setError("Enter a reason — it is permanently recorded in the audit ledger.");
      return;
    }

    setError(null);
    if (pending.kind === "flag") {
      flagMutation.mutate({ plotId: pending.plot.id, reason: trimmed });
      return;
    }
    resolveMutation.mutate({ plotId: pending.plot.id, reason: trimmed });
  }

  const dialogCopy =
    pending?.kind === "flag"
      ? {
          title: `Flag plot ${pending.plot.serialNo} as disputed?`,
          description: `This marks the plot at ${pending.plot.societyName} as disputed and freezes it from further transfer actions until resolved. Your reason is recorded permanently.`,
          confirmLabel: "Flag dispute",
        }
      : pending?.kind === "resolve"
        ? {
            title: `Resolve dispute on ${pending.plot.serialNo}?`,
            description: `This restores the plot to its pre-dispute status at ${pending.plot.societyName}. The resolution reason is recorded in the audit ledger.`,
            confirmLabel: "Resolve dispute",
          }
        : null;

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="font-sans text-md font-semibold text-text-primary">
          Active disputes
        </h2>
        {disputed.length === 0 ? (
          <p className="mt-3 rounded-lg border border-border-base bg-surface-card p-4 font-sans text-sm text-text-secondary">
            No plots are currently flagged as disputed.
          </p>
        ) : (
          <PlotList
            plots={disputed}
            actionLabel="Resolve"
            actionVariant="success"
            onAction={(plot) => {
              setError(null);
              setReason("");
              setPending({ kind: "resolve", plot });
            }}
            badge={<StatusBadge variant="danger">Disputed</StatusBadge>}
          />
        )}
      </section>

      <section>
        <h2 className="font-sans text-md font-semibold text-text-primary">
          Flag a plot
        </h2>
        <p className="mt-1 font-sans text-sm text-text-secondary">
          Allocated or transferred plots with an active booking can be flagged
          when ownership or possession is contested.
        </p>
        {disputable.length === 0 ? (
          <p className="mt-3 rounded-lg border border-border-base bg-surface-card p-4 font-sans text-sm text-text-secondary">
            No eligible plots are available to flag right now.
          </p>
        ) : (
          <PlotList
            plots={disputable}
            actionLabel="Flag dispute"
            actionVariant="destructive"
            onAction={(plot) => {
              setError(null);
              setReason("");
              setPending({ kind: "flag", plot });
            }}
            showStatusBadge
          />
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
            <Label htmlFor="dispute-reason">Reason for audit log</Label>
            <textarea
              id="dispute-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className={cn(
                "min-h-[80px] w-full resize-y rounded-md border border-border-base bg-surface-inset px-3 py-2 font-sans text-sm text-text-primary",
                "placeholder:text-text-tertiary focus-visible:border-border-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/30",
              )}
              placeholder="Describe the dispute or resolution…"
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
            <Button variant="ghost" onClick={() => setPending(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant={pending?.kind === "resolve" ? "success" : "destructive"}
              onClick={confirmAction}
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

function PlotList({
  plots,
  actionLabel,
  actionVariant,
  onAction,
  badge,
  showStatusBadge = false,
}: {
  plots: readonly PlotRow[];
  actionLabel: string;
  actionVariant: "success" | "destructive";
  onAction: (plot: PlotRow) => void;
  badge?: React.ReactNode;
  showStatusBadge?: boolean;
}) {
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {plots.map((plot) => (
        <li
          key={plot.id}
          className="rounded-xl border border-border-base bg-surface-card p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm font-semibold text-text-primary">
                  {plot.serialNo}
                </p>
                {badge}
                {showStatusBadge && plot.status ? (
                  <StatusBadge variant="info">{plot.status}</StatusBadge>
                ) : null}
              </div>
              <p className="mt-1 font-sans text-sm text-text-primary">
                {plot.societyName} · {plot.city}
              </p>
              <p className="font-sans text-xs text-text-tertiary">
                {plot.categoryLabel}
                {plot.buyerName ? ` · ${plot.buyerName}` : ""}
              </p>
            </div>
            <Button
              size="sm"
              variant={actionVariant}
              onClick={() => onAction(plot)}
            >
              {actionLabel}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

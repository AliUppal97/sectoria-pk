"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, FieldError, Input, Label } from "@sectoria/ui";
import { ConfirmDeleteDialog } from "@/components/society/confirm-delete-dialog";
import {
  ReorderControls,
  swapOrderedIds,
} from "@/components/society/reorder-controls";
import { api } from "@/lib/trpc/react";

interface HighlightRow {
  id: string;
  label: string;
  value: string;
  icon: string | null;
  sortOrder: number;
}

export function SocietyHighlightsEditor({
  societyId,
  initialHighlights,
}: {
  societyId: string;
  initialHighlights: readonly HighlightRow[];
}) {
  const router = useRouter();
  const [highlights, setHighlights] = useState<HighlightRow[]>(() => [
    ...initialHighlights,
  ]);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [icon, setIcon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HighlightRow | null>(null);

  const createMutation = api.societyFeature.createHighlight.useMutation({
    onSuccess: () => {
      setLabel("");
      setValue("");
      setIcon("");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });
  const deleteMutation = api.societyFeature.deleteHighlight.useMutation({
    onSuccess: () => {
      setDeleteTarget(null);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });
  const reorderMutation = api.societyFeature.reorderHighlights.useMutation({
    onError: (err) => setError(err.message),
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    createMutation.mutate({
      societyId,
      label: label.trim(),
      value: value.trim(),
      icon: icon.trim() === "" ? null : icon.trim(),
      sortOrder: highlights.length,
    });
  }

  function handleReorder(index: number, direction: "up" | "down") {
    const orderedIds = swapOrderedIds(
      highlights.map((row) => row.id),
      index,
      direction,
    );
    reorderMutation.mutate(
      { societyId, orderedIds },
      {
        onSuccess: () => {
          const reordered = orderedIds
            .map((id, sortOrder) => {
              const row = highlights.find((item) => item.id === id);
              return row ? { ...row, sortOrder } : null;
            })
            .filter((row): row is HighlightRow => row !== null);
          setHighlights(reordered);
          router.refresh();
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="highlight-label">Label</Label>
            <Input
              id="highlight-label"
              className="mt-1.5"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Total area"
              required
            />
          </div>
          <div>
            <Label htmlFor="highlight-value">Value</Label>
            <Input
              id="highlight-value"
              className="mt-1.5"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 500 kanal"
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="highlight-icon">Icon name (optional)</Label>
          <Input
            id="highlight-icon"
            className="mt-1.5"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
          />
        </div>
        {error ? <FieldError>{error}</FieldError> : null}
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Adding…" : "Add highlight"}
        </Button>
      </form>

      {highlights.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary">
          No stat highlights yet. Add key figures buyers should see at a glance.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {highlights.map((row, index) => (
            <li
              key={row.id}
              className="flex gap-3 rounded-xl border border-border-base bg-surface-subtle p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-sans text-3xs uppercase tracking-[0.05em] text-text-tertiary">
                  {row.label}
                </p>
                <p className="font-sans text-md font-semibold text-text-primary">
                  {row.value}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <ReorderControls
                  index={index}
                  total={highlights.length}
                  disabled={reorderMutation.isPending}
                  onMoveUp={() => handleReorder(index, "up")}
                  onMoveDown={() => handleReorder(index, "down")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(row)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        title="Delete highlight?"
        description={`Remove "${deleteTarget?.label ?? "this highlight"}" from your profile?`}
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ highlightId: deleteTarget.id });
          }
        }}
      />
    </div>
  );
}

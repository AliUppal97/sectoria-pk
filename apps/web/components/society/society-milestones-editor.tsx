"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  FieldError,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  formatDate,
} from "@sectoria/ui";
import {
  MilestoneStatus,
  type MilestoneStatus as MilestoneStatusType,
} from "@sectoria/types";
import { ConfirmDeleteDialog } from "@/components/society/confirm-delete-dialog";
import {
  ReorderControls,
  swapOrderedIds,
} from "@/components/society/reorder-controls";
import { api } from "@/lib/trpc/react";

interface MilestoneRow {
  id: string;
  title: string;
  description: string | null;
  occurredOn: string;
  status: MilestoneStatusType;
  sortOrder: number;
}

interface EditDraft {
  title: string;
  description: string;
  occurredOn: string;
  status: MilestoneStatusType;
}

const STATUS_META: Record<
  MilestoneStatusType,
  { label: string; variant: "success" | "info" | "neutral" }
> = {
  [MilestoneStatus.COMPLETED]: { label: "Completed", variant: "success" },
  [MilestoneStatus.IN_PROGRESS]: { label: "In progress", variant: "info" },
  [MilestoneStatus.PLANNED]: { label: "Planned", variant: "neutral" },
};

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export function SocietyMilestonesEditor({
  societyId,
  initialMilestones,
}: {
  societyId: string;
  initialMilestones: readonly MilestoneRow[];
}) {
  const router = useRouter();
  const [milestones, setMilestones] = useState<MilestoneRow[]>(() => [
    ...initialMilestones,
  ]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [status, setStatus] = useState<MilestoneStatusType>(
    MilestoneStatus.COMPLETED,
  );
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MilestoneRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  const createMutation = api.milestone.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setOccurredOn("");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });
  const updateMutation = api.milestone.update.useMutation({
    onSuccess: (updated) => {
      setMilestones((current) =>
        current.map((row) =>
          row.id === updated.id
            ? {
                id: updated.id,
                title: updated.title,
                description: updated.description ?? null,
                occurredOn: updated.occurredOn,
                status: updated.status,
                sortOrder: updated.sortOrder,
              }
            : row,
        ),
      );
      setEditingId(null);
      setEditDraft(null);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });
  const deleteMutation = api.milestone.delete.useMutation({
    onSuccess: () => {
      setDeleteTarget(null);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });
  const reorderMutation = api.milestone.reorder.useMutation({
    onError: (err) => setError(err.message),
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (occurredOn === "") {
      setError("Select a milestone date.");
      return;
    }
    createMutation.mutate({
      societyId,
      title: title.trim(),
      description: description.trim() === "" ? null : description.trim(),
      occurredOn: new Date(occurredOn).toISOString(),
      status,
    });
  }

  function startEditing(row: MilestoneRow) {
    setEditingId(row.id);
    setEditDraft({
      title: row.title,
      description: row.description ?? "",
      occurredOn: toDateInputValue(row.occurredOn),
      status: row.status,
    });
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditDraft(null);
  }

  function handleEditSubmit(event: FormEvent, milestoneId: string) {
    event.preventDefault();
    if (editDraft === null) return;
    setError(null);
    if (editDraft.occurredOn === "") {
      setError("Select a milestone date.");
      return;
    }
    updateMutation.mutate({
      milestoneId,
      data: {
        title: editDraft.title.trim(),
        description:
          editDraft.description.trim() === "" ? null : editDraft.description.trim(),
        occurredOn: new Date(editDraft.occurredOn).toISOString(),
        status: editDraft.status,
      },
    });
  }

  function handleReorder(index: number, direction: "up" | "down") {
    const orderedIds = swapOrderedIds(
      milestones.map((row) => row.id),
      index,
      direction,
    );
    reorderMutation.mutate(
      { societyId, orderedIds },
      {
        onSuccess: () => {
          const reordered = orderedIds
            .map((id, sortOrder) => {
              const row = milestones.find((item) => item.id === id);
              return row ? { ...row, sortOrder } : null;
            })
            .filter((row): row is MilestoneRow => row !== null);
          setMilestones(reordered);
          router.refresh();
        },
      },
    );
  }

  const listPending =
    updateMutation.isPending ||
    deleteMutation.isPending ||
    reorderMutation.isPending;

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <Label htmlFor="milestone-title">Title</Label>
          <Input
            id="milestone-title"
            className="mt-1.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="milestone-description">Description (optional)</Label>
          <textarea
            id="milestone-description"
            className="mt-1.5 min-h-20 w-full rounded-md border border-border-base bg-surface-card px-3 py-2 font-sans text-sm text-text-primary"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="milestone-date">Date</Label>
            <Input
              id="milestone-date"
              type="date"
              className="mt-1.5"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="milestone-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as MilestoneStatusType)}
            >
              <SelectTrigger id="milestone-status" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(MilestoneStatus).map((value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_META[value].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {error && editingId === null ? <FieldError>{error}</FieldError> : null}
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Adding…" : "Add milestone"}
        </Button>
      </form>

      {milestones.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary">
          No milestones yet. Add NOC approval, balloting, and possession dates.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {milestones.map((row, index) => {
            const meta = STATUS_META[row.status];
            const isEditing = editingId === row.id && editDraft !== null;

            return (
              <li
                key={row.id}
                className="rounded-xl border border-border-base bg-surface-subtle p-4"
              >
                {isEditing ? (
                  <form
                    onSubmit={(event) => handleEditSubmit(event, row.id)}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor={`edit-title-${row.id}`}>Title</Label>
                      <Input
                        id={`edit-title-${row.id}`}
                        className="mt-1.5"
                        value={editDraft.title}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, title: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor={`edit-description-${row.id}`}>
                        Description (optional)
                      </Label>
                      <textarea
                        id={`edit-description-${row.id}`}
                        className="mt-1.5 min-h-20 w-full rounded-md border border-border-base bg-surface-card px-3 py-2 font-sans text-sm text-text-primary"
                        value={editDraft.description}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`edit-date-${row.id}`}>Date</Label>
                        <Input
                          id={`edit-date-${row.id}`}
                          type="date"
                          className="mt-1.5"
                          value={editDraft.occurredOn}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              occurredOn: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-status-${row.id}`}>Status</Label>
                        <Select
                          value={editDraft.status}
                          onValueChange={(v) =>
                            setEditDraft({
                              ...editDraft,
                              status: v as MilestoneStatusType,
                            })
                          }
                        >
                          <SelectTrigger id={`edit-status-${row.id}`} className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(MilestoneStatus).map((value) => (
                              <SelectItem key={value} value={value}>
                                {STATUS_META[value].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {error ? <FieldError>{error}</FieldError> : null}
                    <div className="flex gap-2">
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Saving…" : "Save milestone"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={updateMutation.isPending}
                        onClick={cancelEditing}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
                        <time className="font-sans text-xs text-text-tertiary">
                          {formatDate(row.occurredOn)}
                        </time>
                      </div>
                      <p className="mt-1 font-sans text-sm font-semibold text-text-primary">
                        {row.title}
                      </p>
                      {row.description ? (
                        <p className="font-sans text-sm text-text-secondary">
                          {row.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <ReorderControls
                        index={index}
                        total={milestones.length}
                        disabled={listPending}
                        onMoveUp={() => handleReorder(index, "up")}
                        onMoveDown={() => handleReorder(index, "down")}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={listPending}
                          onClick={() => startEditing(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={listPending}
                          onClick={() => setDeleteTarget(row)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        title="Delete milestone?"
        description={`Remove "${deleteTarget?.title ?? "this milestone"}" from your development roadmap?`}
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ milestoneId: deleteTarget.id });
          }
        }}
      />
    </div>
  );
}

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

interface AmenityRow {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  sortOrder: number;
}

export function SocietyAmenitiesEditor({
  societyId,
  initialAmenities,
}: {
  societyId: string;
  initialAmenities: readonly AmenityRow[];
}) {
  const router = useRouter();
  const [amenities, setAmenities] = useState<AmenityRow[]>(() => [
    ...initialAmenities,
  ]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AmenityRow | null>(null);

  const createMutation = api.societyFeature.createAmenity.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setIcon("");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });
  const deleteMutation = api.societyFeature.deleteAmenity.useMutation({
    onSuccess: () => {
      setDeleteTarget(null);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });
  const reorderMutation = api.societyFeature.reorderAmenities.useMutation({
    onError: (err) => setError(err.message),
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    createMutation.mutate({
      societyId,
      title: title.trim(),
      description: description.trim(),
      icon: icon.trim() === "" ? null : icon.trim(),
      sortOrder: amenities.length,
    });
  }

  function handleReorder(index: number, direction: "up" | "down") {
    const orderedIds = swapOrderedIds(
      amenities.map((row) => row.id),
      index,
      direction,
    );
    reorderMutation.mutate(
      { societyId, orderedIds },
      {
        onSuccess: () => {
          const reordered = orderedIds
            .map((id, sortOrder) => {
              const row = amenities.find((item) => item.id === id);
              return row ? { ...row, sortOrder } : null;
            })
            .filter((row): row is AmenityRow => row !== null);
          setAmenities(reordered);
          router.refresh();
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <Label htmlFor="amenity-title">Title</Label>
          <Input
            id="amenity-title"
            className="mt-1.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="amenity-description">Description</Label>
          <textarea
            id="amenity-description"
            className="mt-1.5 min-h-20 w-full rounded-md border border-border-base bg-surface-card px-3 py-2 font-sans text-sm text-text-primary"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="amenity-icon">Icon name (optional)</Label>
          <Input
            id="amenity-icon"
            className="mt-1.5"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="e.g. swimming-pool"
          />
        </div>
        {error ? <FieldError>{error}</FieldError> : null}
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Adding…" : "Add amenity"}
        </Button>
      </form>

      {amenities.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary">
          No amenity cards yet. Add your first feature above.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {amenities.map((row, index) => (
            <li
              key={row.id}
              className="flex gap-3 rounded-xl border border-border-base bg-surface-subtle p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-sans text-sm font-semibold text-text-primary">
                  {row.title}
                </p>
                <p className="font-sans text-sm text-text-secondary">
                  {row.description}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <ReorderControls
                  index={index}
                  total={amenities.length}
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
        title="Delete amenity?"
        description={`Remove "${deleteTarget?.title ?? "this amenity"}" from your public profile?`}
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ amenityId: deleteTarget.id });
          }
        }}
      />
    </div>
  );
}

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
} from "@sectoria/ui";
import {
  LandmarkCategory,
  type LandmarkCategory as LandmarkCat,
} from "@sectoria/types";
import { ConfirmDeleteDialog } from "@/components/society/confirm-delete-dialog";
import {
  ReorderControls,
  swapOrderedIds,
} from "@/components/society/reorder-controls";
import { api } from "@/lib/trpc/react";

interface LandmarkRow {
  id: string;
  name: string;
  category: LandmarkCat;
  distanceKm: string | null;
  driveTimeMins: number | null;
  sortOrder: number;
}

export function SocietyLandmarksEditor({
  societyId,
  initialLandmarks,
}: {
  societyId: string;
  initialLandmarks: readonly LandmarkRow[];
}) {
  const router = useRouter();
  const [landmarks, setLandmarks] = useState<LandmarkRow[]>(() => [
    ...initialLandmarks,
  ]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<LandmarkCat>(
    LandmarkCategory.LANDMARK,
  );
  const [distanceKm, setDistanceKm] = useState("");
  const [driveTimeMins, setDriveTimeMins] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LandmarkRow | null>(null);

  const createMutation = api.landmark.create.useMutation({
    onSuccess: () => {
      setName("");
      setDistanceKm("");
      setDriveTimeMins("");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });
  const deleteMutation = api.landmark.delete.useMutation({
    onSuccess: () => {
      setDeleteTarget(null);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });
  const reorderMutation = api.landmark.reorder.useMutation({
    onError: (err) => setError(err.message),
  });

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    createMutation.mutate({
      societyId,
      name: name.trim(),
      category,
      distanceKm: distanceKm.trim() === "" ? null : distanceKm.trim(),
      driveTimeMins:
        driveTimeMins.trim() === "" ? null : Number.parseInt(driveTimeMins, 10),
      sortOrder: landmarks.length,
    });
  }

  function handleReorder(index: number, direction: "up" | "down") {
    const orderedIds = swapOrderedIds(
      landmarks.map((row) => row.id),
      index,
      direction,
    );
    reorderMutation.mutate(
      { societyId, orderedIds },
      {
        onSuccess: () => {
          const reordered = orderedIds
            .map((id, sortOrder) => {
              const row = landmarks.find((item) => item.id === id);
              return row ? { ...row, sortOrder } : null;
            })
            .filter((row): row is LandmarkRow => row !== null);
          setLandmarks(reordered);
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
            <Label htmlFor="landmark-name">Name</Label>
            <Input
              id="landmark-name"
              className="mt-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="landmark-category">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as LandmarkCat)}
            >
              <SelectTrigger id="landmark-category" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(LandmarkCategory).map((value) => (
                  <SelectItem key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="landmark-distance">Distance (km, optional)</Label>
            <Input
              id="landmark-distance"
              className="mt-1.5"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              placeholder="e.g. 12.5"
            />
          </div>
          <div>
            <Label htmlFor="landmark-drive">Drive time (mins, optional)</Label>
            <Input
              id="landmark-drive"
              type="number"
              min={1}
              className="mt-1.5"
              value={driveTimeMins}
              onChange={(e) => setDriveTimeMins(e.target.value)}
            />
          </div>
        </div>
        {error ? <FieldError>{error}</FieldError> : null}
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Adding…" : "Add landmark"}
        </Button>
      </form>

      {landmarks.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary">
          No nearby landmarks yet. Add airports, schools, and interchanges buyers care about.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {landmarks.map((row, index) => (
            <li
              key={row.id}
              className="flex gap-3 rounded-xl border border-border-base bg-surface-subtle p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge variant="neutral">
                    {row.category.replaceAll("_", " ")}
                  </StatusBadge>
                </div>
                <p className="mt-1 font-sans text-sm font-semibold text-text-primary">
                  {row.name}
                </p>
                <p className="font-sans text-xs text-text-secondary">
                  {row.distanceKm ? `${row.distanceKm} km` : null}
                  {row.distanceKm && row.driveTimeMins ? " · " : null}
                  {row.driveTimeMins ? `${row.driveTimeMins} min drive` : null}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <ReorderControls
                  index={index}
                  total={landmarks.length}
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
        title="Delete landmark?"
        description={`Remove "${deleteTarget?.name ?? "this landmark"}" from your connectivity section?`}
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ landmarkId: deleteTarget.id });
          }
        }}
      />
    </div>
  );
}

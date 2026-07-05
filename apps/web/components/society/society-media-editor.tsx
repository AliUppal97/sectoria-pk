"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
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
  SocietyMediaKind,
  type SocietyMediaKind as MediaKind,
} from "@sectoria/types";
import { ConfirmDeleteDialog } from "@/components/society/confirm-delete-dialog";
import {
  ReorderControls,
  swapOrderedIds,
} from "@/components/society/reorder-controls";
import { uploadViaPresignedUrl } from "@/lib/society/presigned-upload";
import { api } from "@/lib/trpc/react";

interface MediaRow {
  id: string;
  kind: MediaKind;
  storageKey: string;
  alt: string;
  caption: string | null;
  capturedAt: string | null;
  sortOrder: number;
  url?: string;
}

const KIND_LABELS: Record<MediaKind, string> = {
  [SocietyMediaKind.HERO]: "Hero",
  [SocietyMediaKind.GALLERY]: "Gallery",
  [SocietyMediaKind.PROGRESS]: "Progress",
  [SocietyMediaKind.FLOORPLAN]: "Floor plans",
};

export function SocietyMediaEditor({
  societyId,
  initialMedia,
}: {
  societyId: string;
  initialMedia: readonly MediaRow[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<MediaRow[]>(() => [...initialMedia]);
  const [kind, setKind] = useState<MediaKind>(SocietyMediaKind.GALLERY);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [capturedAt, setCapturedAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaRow | null>(null);

  const requestUpload = api.storage.requestUploadUrl.useMutation();
  const createMutation = api.media.create.useMutation({
    onSuccess: () => router.refresh(),
    onError: (err) => setError(err.message),
  });
  const deleteMutation = api.media.delete.useMutation({
    onSuccess: () => {
      setDeleteTarget(null);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });
  const reorderMutation = api.media.reorder.useMutation({
    onError: (err) => setError(err.message),
  });

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (file === undefined || alt.trim() === "") {
      setError("Choose a file and enter alt text.");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadViaPresignedUrl({
        file,
        societyId,
        visibility: "public",
        resourceType: "media",
        requestUploadUrl: (input) => requestUpload.mutateAsync(input),
      });
      await createMutation.mutateAsync({
        societyId,
        kind,
        storageKey: uploaded.storageKey,
        alt: alt.trim(),
        caption: caption.trim() === "" ? null : caption.trim(),
        capturedAt:
          kind === SocietyMediaKind.PROGRESS && capturedAt !== ""
            ? new Date(capturedAt).toISOString()
            : null,
        sortOrder: media.filter((row) => row.kind === kind).length,
      });
      setAlt("");
      setCaption("");
      setCapturedAt("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  function handleReorder(kindFilter: MediaKind, index: number, direction: "up" | "down") {
    const kindItems = media.filter((row) => row.kind === kindFilter);
    const orderedIds = swapOrderedIds(
      kindItems.map((row) => row.id),
      index,
      direction,
    );
    reorderMutation.mutate(
      { societyId, orderedIds },
      {
        onSuccess: () => {
          const reordered = orderedIds
            .map((id, sortOrder) => {
              const row = kindItems.find((item) => item.id === id);
              return row ? { ...row, sortOrder } : null;
            })
            .filter((row): row is MediaRow => row !== null);
          setMedia((prev) => [
            ...prev.filter((row) => row.kind !== kindFilter),
            ...reordered,
          ]);
          router.refresh();
        },
      },
    );
  }

  const pending =
    uploading || createMutation.isPending || reorderMutation.isPending;

  return (
    <div className="space-y-8">
      <form onSubmit={handleUpload} className="space-y-4">
        <h3 className="font-sans text-sm font-semibold text-text-primary">
          Upload media
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="media-kind">Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as MediaKind)}>
              <SelectTrigger id="media-kind" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(SocietyMediaKind).map((value) => (
                  <SelectItem key={value} value={value}>
                    {KIND_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="media-file">File (JPEG or PNG, max 10 MiB)</Label>
            <Input
              ref={fileRef}
              id="media-file"
              type="file"
              accept="image/jpeg,image/png"
              className="mt-1.5"
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="media-alt">Alt text</Label>
          <Input
            id="media-alt"
            className="mt-1.5"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="media-caption">Caption (optional)</Label>
          <Input
            id="media-caption"
            className="mt-1.5"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
        {kind === SocietyMediaKind.PROGRESS ? (
          <div>
            <Label htmlFor="media-captured">Capture date</Label>
            <Input
              id="media-captured"
              type="date"
              className="mt-1.5"
              value={capturedAt}
              onChange={(e) => setCapturedAt(e.target.value)}
            />
          </div>
        ) : null}
        {error ? <FieldError>{error}</FieldError> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </form>

      {(Object.values(SocietyMediaKind) as MediaKind[]).map((kindFilter) => {
        const items = media
          .filter((row) => row.kind === kindFilter)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        if (items.length === 0) return null;
        return (
          <section key={kindFilter} className="space-y-3">
            <h3 className="font-sans text-sm font-semibold text-text-primary">
              {KIND_LABELS[kindFilter]}
            </h3>
            <ul className="flex flex-col gap-3">
              {items.map((row, index) => (
                <li
                  key={row.id}
                  className="flex gap-3 rounded-xl border border-border-base bg-surface-subtle p-3"
                >
                  {row.url ? (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-surface-card">
                      <Image
                        src={row.url}
                        alt={row.alt}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-sm font-medium text-text-primary">
                      {row.alt}
                    </p>
                    {row.caption ? (
                      <p className="font-sans text-xs text-text-secondary">
                        {row.caption}
                      </p>
                    ) : null}
                    {row.capturedAt ? (
                      <StatusBadge variant="neutral">
                        {new Date(row.capturedAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </StatusBadge>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <ReorderControls
                      index={index}
                      total={items.length}
                      disabled={reorderMutation.isPending}
                      onMoveUp={() => handleReorder(kindFilter, index, "up")}
                      onMoveDown={() => handleReorder(kindFilter, index, "down")}
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
          </section>
        );
      })}

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        title="Delete media?"
        description={`This will permanently remove "${deleteTarget?.alt ?? "this image"}" from your public profile.`}
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ mediaId: deleteTarget.id });
          }
        }}
      />
    </div>
  );
}

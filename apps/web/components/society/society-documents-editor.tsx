"use client";

import { useRef, useState, type FormEvent } from "react";
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
  SocietyDocumentKind,
  type SocietyDocumentKind as DocKind,
} from "@sectoria/types";
import { ConfirmDeleteDialog } from "@/components/society/confirm-delete-dialog";
import {
  ReorderControls,
  swapOrderedIds,
} from "@/components/society/reorder-controls";
import { uploadViaPresignedUrl } from "@/lib/society/presigned-upload";
import { api } from "@/lib/trpc/react";

interface DocumentRow {
  id: string;
  kind: DocKind;
  title: string;
  isPublic: boolean;
  fileSize: number;
  contentType: string;
  sortOrder: number;
  url?: string;
}

const KIND_LABELS: Record<DocKind, string> = {
  [SocietyDocumentKind.MASTER_PLAN]: "Master plan",
  [SocietyDocumentKind.BROCHURE]: "Brochure",
  [SocietyDocumentKind.PAYMENT_PLAN]: "Payment plan",
  [SocietyDocumentKind.LOP]: "LOP",
  [SocietyDocumentKind.NOC]: "NOC",
  [SocietyDocumentKind.OTHER]: "Other",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SocietyDocumentsEditor({
  societyId,
  initialDocuments,
}: {
  societyId: string;
  initialDocuments: readonly DocumentRow[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>(() => [
    ...initialDocuments,
  ]);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<DocKind>(SocietyDocumentKind.BROCHURE);
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRow | null>(null);
  const [toggleTarget, setToggleTarget] = useState<DocumentRow | null>(null);

  const requestUpload = api.storage.requestUploadUrl.useMutation();
  const createMutation = api.document.create.useMutation({
    onSuccess: () => {
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });
  const updateMutation = api.document.update.useMutation({
    onSuccess: () => {
      setToggleTarget(null);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });
  const deleteMutation = api.document.delete.useMutation({
    onSuccess: () => {
      setDeleteTarget(null);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });
  const reorderMutation = api.document.reorder.useMutation({
    onError: (err) => setError(err.message),
  });
  const downloadMutation = api.document.getDownloadUrl.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank", "noopener,noreferrer");
    },
    onError: (err) => setError(err.message),
  });

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (file === undefined || title.trim() === "") {
      setError("Choose a file and enter a title.");
      return;
    }

    const isSensitive =
      kind === SocietyDocumentKind.LOP || kind === SocietyDocumentKind.NOC;
    const visibility = isPublic && !isSensitive ? "public" : "private";

    setUploading(true);
    try {
      const uploaded = await uploadViaPresignedUrl({
        file,
        societyId,
        visibility,
        resourceType: "document",
        requestUploadUrl: (input) => requestUpload.mutateAsync(input),
      });
      await createMutation.mutateAsync({
        societyId,
        kind,
        title: title.trim(),
        storageKey: uploaded.storageKey,
        fileSize: uploaded.fileSize,
        contentType: uploaded.contentType,
        isPublic: isSensitive ? false : isPublic,
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  function handleReorder(index: number, direction: "up" | "down") {
    const orderedIds = swapOrderedIds(
      documents.map((row) => row.id),
      index,
      direction,
    );
    reorderMutation.mutate(
      { societyId, orderedIds },
      {
        onSuccess: () => {
          const reordered = orderedIds
            .map((id, sortOrder) => {
              const row = documents.find((item) => item.id === id);
              return row ? { ...row, sortOrder } : null;
            })
            .filter((row): row is DocumentRow => row !== null);
          setDocuments(reordered);
          router.refresh();
        },
      },
    );
  }

  const pending =
    uploading ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    reorderMutation.isPending;

  return (
    <div className="space-y-8">
      <form onSubmit={handleUpload} className="space-y-4">
        <h3 className="font-sans text-sm font-semibold text-text-primary">
          Upload document
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="doc-kind">Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as DocKind)}>
              <SelectTrigger id="doc-kind" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(SocietyDocumentKind).map((value) => (
                  <SelectItem key={value} value={value}>
                    {KIND_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="doc-file">File (PDF, JPEG, or PNG)</Label>
            <Input
              ref={fileRef}
              id="doc-file"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className="mt-1.5"
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="doc-title">Title</Label>
          <Input
            id="doc-title"
            className="mt-1.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            disabled={
              kind === SocietyDocumentKind.LOP ||
              kind === SocietyDocumentKind.NOC
            }
            className="h-4 w-4 rounded border-border-strong"
          />
          <span className="font-sans text-sm text-text-secondary">
            Visible on public profile
            {kind === SocietyDocumentKind.LOP ||
            kind === SocietyDocumentKind.NOC
              ? " (LOP/NOC are always private)"
              : null}
          </span>
        </label>
        {error ? <FieldError>{error}</FieldError> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload document"}
        </Button>
      </form>

      {documents.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary">
          No documents yet. Upload your master plan or brochure above.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {documents.map((doc, index) => (
            <li
              key={doc.id}
              className="flex gap-3 rounded-xl border border-border-base bg-surface-subtle p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge variant={doc.isPublic ? "success" : "warning"}>
                    {doc.isPublic ? "Public" : "Private"}
                  </StatusBadge>
                  <StatusBadge variant="neutral">{KIND_LABELS[doc.kind]}</StatusBadge>
                </div>
                <p className="mt-1 font-sans text-sm font-medium text-text-primary">
                  {doc.title}
                </p>
                <p className="font-sans text-xs text-text-tertiary">
                  {formatFileSize(doc.fileSize)} · {doc.contentType}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <ReorderControls
                  index={index}
                  total={documents.length}
                  disabled={reorderMutation.isPending}
                  onMoveUp={() => handleReorder(index, "up")}
                  onMoveDown={() => handleReorder(index, "down")}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={downloadMutation.isPending}
                    onClick={() => downloadMutation.mutate({ documentId: doc.id })}
                  >
                    Download
                  </Button>
                  {doc.kind !== SocietyDocumentKind.LOP &&
                  doc.kind !== SocietyDocumentKind.NOC ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setToggleTarget(doc)}
                    >
                      {doc.isPublic ? "Make private" : "Make public"}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(doc)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        title="Delete document?"
        description={`This will permanently remove "${deleteTarget?.title ?? "this document"}" and cannot be undone.`}
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ documentId: deleteTarget.id });
          }
        }}
      />

      <ConfirmDeleteDialog
        open={toggleTarget !== null}
        title={
          toggleTarget?.isPublic ? "Make document private?" : "Make document public?"
        }
        description={
          toggleTarget?.isPublic
            ? `"${toggleTarget.title}" will no longer appear on your public profile. Buyers will need authenticated access to download it.`
            : `"${toggleTarget?.title ?? "This document"}" will be visible and downloadable on your public profile.`
        }
        confirmLabel={toggleTarget?.isPublic ? "Make private" : "Make public"}
        isPending={updateMutation.isPending}
        onCancel={() => setToggleTarget(null)}
        onConfirm={() => {
          if (toggleTarget) {
            updateMutation.mutate({
              documentId: toggleTarget.id,
              data: { isPublic: !toggleTarget.isPublic },
            });
          }
        }}
      />
    </div>
  );
}

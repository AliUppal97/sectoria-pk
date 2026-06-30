"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  StatusBadge,
  formatDate,
} from "@sectoria/ui";
import type { SocietyUpdateCategory } from "@sectoria/types";
import { SocietyUpdateForm } from "@/components/society/society-update-form";
import { api } from "@/lib/trpc/react";

interface UpdateRow {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly category: SocietyUpdateCategory;
  readonly publishedAt: string;
  readonly isPublished: boolean;
}

export function SocietyUpdatesAdminList({
  updates,
  societyId,
}: {
  updates: readonly UpdateRow[];
  societyId: string;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const deleteMutation = api.societyUpdate.delete.useMutation({
    onSuccess: () => {
      setEditingId(null);
      router.refresh();
    },
  });

  if (updates.length === 0) {
    return (
      <p className="font-sans text-sm text-text-secondary">
        No updates yet. Publish your first milestone above.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {updates.map((update) => (
        <li
          key={update.id}
          className="rounded-xl border border-border-base bg-surface-subtle p-4"
        >
          {editingId === update.id ? (
            <SocietyUpdateForm
              societyId={societyId}
              updateId={update.id}
              initial={{
                title: update.title,
                body: update.body,
                category: update.category,
                isPublished: update.isPublished,
              }}
              onSuccess={() => setEditingId(null)}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge variant={update.isPublished ? "success" : "warning"}>
                  {update.isPublished ? "Published" : "Draft"}
                </StatusBadge>
                <StatusBadge variant="neutral">{update.category}</StatusBadge>
                <time className="font-sans text-xs text-text-tertiary">
                  {formatDate(update.publishedAt)}
                </time>
              </div>
              <h3 className="font-sans text-sm font-semibold text-text-primary">
                {update.title}
              </h3>
              <p className="font-sans text-sm text-text-secondary">{update.body}</p>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingId(update.id)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate({ updateId: update.id })}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

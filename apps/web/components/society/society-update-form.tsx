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
} from "@sectoria/ui";
import {
  SocietyUpdateCategory,
  type SocietyUpdateCategory as UpdateCategory,
} from "@sectoria/types";
import { api } from "@/lib/trpc/react";

interface SocietyUpdateFormProps {
  societyId: string;
  updateId?: string;
  initial?: {
    title: string;
    body: string;
    category: UpdateCategory;
    isPublished: boolean;
  };
  onSuccess?: () => void;
}

export function SocietyUpdateForm({
  societyId,
  updateId,
  initial,
  onSuccess,
}: SocietyUpdateFormProps) {
  const router = useRouter();
  const isEdit = updateId !== undefined;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [category, setCategory] = useState<UpdateCategory>(
    initial?.category ?? SocietyUpdateCategory.GENERAL,
  );
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);
  const [error, setError] = useState<string | null>(null);

  const createMutation = api.societyUpdate.create.useMutation({
    onSuccess: () => {
      router.refresh();
      onSuccess?.();
    },
    onError: (err) => setError(err.message),
  });
  const updateMutation = api.societyUpdate.update.useMutation({
    onSuccess: () => {
      router.refresh();
      onSuccess?.();
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (isEdit && updateId !== undefined) {
      updateMutation.mutate({
        updateId,
        data: { title, body, category, isPublished },
      });
    } else {
      createMutation.mutate({
        societyId,
        title,
        body,
        category,
        isPublished,
      });
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="update-title">Title</Label>
        <Input
          id="update-title"
          className="mt-1.5"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="update-category">Category</Label>
        <Select
          value={category}
          onValueChange={(value) => setCategory(value as UpdateCategory)}
        >
          <SelectTrigger id="update-category" className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(SocietyUpdateCategory).map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="update-body">Body</Label>
        <textarea
          id="update-body"
          className="mt-1.5 min-h-28 w-full rounded-md border border-border-base bg-surface-card px-3 py-2 font-sans text-sm text-text-primary"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="h-4 w-4 rounded border-border-strong"
        />
        <span className="font-sans text-sm text-text-secondary">
          Published on public profile
        </span>
      </label>
      {error ? <FieldError>{error}</FieldError> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : isEdit ? "Save update" : "Publish update"}
      </Button>
    </form>
  );
}

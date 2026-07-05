"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FieldError,
  Input,
  Label,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatDate,
} from "@sectoria/ui";
import { ConfirmDeleteDialog } from "@/components/society/confirm-delete-dialog";
import { api } from "@/lib/trpc/react";

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  authorName: string;
  isPublished: boolean;
  publishedAt: string | null;
}

export function ArticleConsole({
  initialArticles,
}: {
  initialArticles: readonly ArticleRow[];
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ArticleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ArticleRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const createMutation = api.article.create.useMutation({
    onSuccess: () => {
      resetForm();
      setShowCreate(false);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const updateMutation = api.article.update.useMutation({
    onSuccess: () => {
      resetForm();
      setEditing(null);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const deleteMutation = api.article.delete.useMutation({
    onSuccess: () => {
      setDeleteTarget(null);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  function resetForm() {
    setSlug("");
    setTitle("");
    setExcerpt("");
    setBody("");
    setAuthorName("");
    setIsPublished(false);
    setError(null);
  }

  function openEdit(article: ArticleRow) {
    setEditing(article);
    setSlug(article.slug);
    setTitle(article.title);
    setExcerpt(article.excerpt);
    setBody(article.body);
    setAuthorName(article.authorName);
    setIsPublished(article.isPublished);
    setShowCreate(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (editing) {
      updateMutation.mutate({
        articleId: editing.id,
        data: {
          slug: slug.trim(),
          title: title.trim(),
          excerpt: excerpt.trim(),
          body: body.trim(),
          authorName: authorName.trim(),
          isPublished,
          publishedAt: isPublished ? new Date().toISOString() : null,
        },
      });
    } else {
      createMutation.mutate({
        slug: slug.trim(),
        title: title.trim(),
        excerpt: excerpt.trim(),
        body: body.trim(),
        authorName: authorName.trim(),
        isPublished,
        publishedAt: isPublished ? new Date().toISOString() : null,
      });
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-sm text-text-secondary">
          Author editorial content for the blog and related-reading blocks.
        </p>
        <Button
          type="button"
          onClick={() => {
            resetForm();
            setEditing(null);
            setShowCreate(true);
          }}
        >
          <Plus aria-hidden="true" className="mr-1.5 h-4 w-4" />
          New article
        </Button>
      </div>

      {initialArticles.length === 0 ? (
        <EmptyState
          icon={FileText}
          heading="No articles yet"
          description="Create the first article for the content hub."
          action={
            <Button type="button" onClick={() => setShowCreate(true)}>
              New article
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialArticles.map((article) => (
              <TableRow key={article.id}>
                <TableCell>
                  <p className="font-medium">{article.title}</p>
                  <p className="font-sans text-xs text-text-tertiary">
                    /blog/{article.slug}
                  </p>
                </TableCell>
                <TableCell>
                  <StatusBadge variant={article.isPublished ? "success" : "warning"}>
                    {article.isPublished ? "Published" : "Draft"}
                  </StatusBadge>
                </TableCell>
                <TableCell>
                  {article.publishedAt
                    ? formatDate(article.publishedAt)
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(article)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(article)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) {
            setEditing(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit article" : "New article"}</DialogTitle>
            <DialogDescription>
              Body is markdown — rendered server-side with a sanitizer on publish.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="article-slug">Slug</Label>
              <Input
                id="article-slug"
                className="mt-1.5"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="article-title">Title</Label>
              <Input
                id="article-title"
                className="mt-1.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="article-excerpt">Excerpt</Label>
              <textarea
                id="article-excerpt"
                className="mt-1.5 min-h-16 w-full rounded-md border border-border-base bg-surface-card px-3 py-2 font-sans text-sm"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="article-body">Body (markdown)</Label>
              <textarea
                id="article-body"
                className="mt-1.5 min-h-40 w-full rounded-md border border-border-base bg-surface-card px-3 py-2 font-mono text-sm"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="article-author">Author name</Label>
              <Input
                id="article-author"
                className="mt-1.5"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
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
                Published on blog
              </span>
            </label>
            {error ? <FieldError>{error}</FieldError> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : editing ? "Save changes" : "Create article"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        title="Delete article?"
        description={`Permanently delete "${deleteTarget?.title ?? "this article"}"? This cannot be undone.`}
        isPending={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate({ articleId: deleteTarget.id });
          }
        }}
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Search } from "lucide-react";
import {
  PAKISTAN_CITIES,
  REGULATORY_AUTHORITIES,
  SocietyPublishStatus,
} from "@sectoria/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  ProgressBar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
  useDebouncedValue,
} from "@sectoria/ui";
import { api, trpcVanilla } from "@/lib/trpc/react";
import { revalidateSociety } from "@/app/(admin)/admin/societies/actions";

const LIST_QUERY_KEY = "admin-societies";

const PAGE_SIZE = 25;

type StatusFilter = "ALL" | SocietyPublishStatus;

/**
 * A society row as returned by `society.listForAdmin`. Kept as an explicit
 * interface (rather than `inferRouterOutputs`) so the huge router type isn't
 * instantiated here — the fields still match the procedure's return shape.
 */
interface AdminSociety {
  id: string;
  name: string;
  slug: string;
  city: string;
  citySlug: string;
  authority: string;
  verificationTier: string;
  publishStatus: SocietyPublishStatus;
  developmentPct: number;
  hasAdmin: boolean;
  completeness: {
    score: number;
    missing: string[];
    isPublishable: boolean;
  };
  createdAt: string;
}

/** A lifecycle transition awaiting confirmation. */
type PendingTransition = {
  society: AdminSociety;
  target: SocietyPublishStatus;
  verb: "Publish" | "Unpublish" | "Archive" | "Restore";
};

const STATUS_META: Record<
  SocietyPublishStatus,
  { label: string; variant: "success" | "warning" | "neutral" }
> = {
  [SocietyPublishStatus.DRAFT]: { label: "Draft", variant: "warning" },
  [SocietyPublishStatus.PUBLISHED]: { label: "Published", variant: "success" },
  [SocietyPublishStatus.ARCHIVED]: { label: "Archived", variant: "neutral" },
};

/**
 * Interactive onboarding console (M0.3). Everything here talks to the ops-only
 * `society.*` procedures via the typed tRPC client — creation starts a DRAFT,
 * and the publish/unpublish/archive actions run through confirm dialogs. Design
 * tokens only (no raw hex); the completeness column is the same pure helper the
 * server gate uses, so the UI can never disagree with the gate.
 */
export function SocietyConsole() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [cursor, setCursor] = useState<string | null>(null);
  const [prevCursors, setPrevCursors] = useState<(string | null)[]>([]);

  // Reset to the first page whenever the query (search/filter) changes, so a
  // stale cursor from a previous result set is never reused.
  function resetPaging() {
    setCursor(null);
    setPrevCursors([]);
  }

  const listInput = useMemo(
    () => ({
      limit: PAGE_SIZE,
      search: search.trim().length > 0 ? search.trim() : undefined,
      publishStatus:
        statusFilter === "ALL" ? undefined : (statusFilter as SocietyPublishStatus),
      cursor,
    }),
    [search, statusFilter, cursor],
  );

  const listQuery = useQuery({
    queryKey: [LIST_QUERY_KEY, listInput],
    queryFn: () => trpcVanilla.society.listForAdmin.query(listInput),
  });

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: [LIST_QUERY_KEY] });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pending, setPending] = useState<PendingTransition | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const setStatus = api.society.setPublishStatus.useMutation({
    onError: (err) => setActionError(err.message),
    onSuccess: async () => {
      const target = pending;
      setPending(null);
      setActionError(null);
      await invalidateList();
      // Refresh the public ISR pages immediately (M0.7 on-demand revalidation).
      if (target !== null) {
        void revalidateSociety(target.society.citySlug, target.society.slug);
      }
    },
  });

  function confirmTransition() {
    if (pending === null) return;
    setActionError(null);
    setStatus.mutate({
      societyId: pending.society.id,
      status: pending.target,
    });
  }

  const items: AdminSociety[] = listQuery.data?.items ?? [];
  const nextCursor = listQuery.data?.nextCursor ?? null;
  const canGoBack = prevCursors.length > 0;

  function goNext() {
    if (nextCursor === null) return;
    setPrevCursors((stack) => [...stack, cursor]);
    setCursor(nextCursor);
  }

  function goBack() {
    setPrevCursors((stack) => {
      const next = [...stack];
      const last = next.pop() ?? null;
      setCursor(last);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
            />
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                resetPaging();
              }}
              placeholder="Search by name or city…"
              aria-label="Search societies"
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as StatusFilter);
              resetPaging();
            }}
          >
            <SelectTrigger className="sm:w-44" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value={SocietyPublishStatus.DRAFT}>Draft</SelectItem>
              <SelectItem value={SocietyPublishStatus.PUBLISHED}>
                Published
              </SelectItem>
              <SelectItem value={SocietyPublishStatus.ARCHIVED}>
                Archived
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="shrink-0">
          <Plus aria-hidden="true" className="h-4 w-4" />
          Create society
        </Button>
      </div>

      {/* ── List ────────────────────────────────────────────────── */}
      {listQuery.isError ? (
        <div
          role="alert"
          className="rounded-lg border border-danger-border bg-danger-bg p-4 font-sans text-sm text-danger-text"
        >
          We couldn&rsquo;t load societies. Please try again.
        </div>
      ) : items.length === 0 && !listQuery.isPending ? (
        <EmptyState
          icon={Building2}
          heading="No societies yet"
          description="Create the first society as a draft, complete its profile, then publish it to the marketplace."
          action={
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Create society
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-base bg-surface-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Society</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Authority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-48">Completeness</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((society) => (
                <TableRow key={society.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-sans text-sm font-semibold text-text-primary">
                        {society.name}
                      </span>
                      <span className="font-mono text-xs text-text-tertiary">
                        /{society.slug}
                        {society.hasAdmin ? " · admin linked" : ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {society.city}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {society.authority}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={STATUS_META[society.publishStatus].variant}>
                      {STATUS_META[society.publishStatus].label}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        value={society.completeness.score}
                        className="flex-1"
                      />
                      <span
                        className="w-10 shrink-0 text-right font-mono text-xs text-text-secondary"
                        title={
                          society.completeness.missing.length > 0
                            ? `Missing: ${society.completeness.missing.join(", ")}`
                            : "All required fields complete"
                        }
                      >
                        {society.completeness.score}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RowActions
                      society={society}
                      onTransition={(transition) => {
                        setActionError(null);
                        setPending(transition);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────── */}
      {(canGoBack || nextCursor !== null) && items.length > 0 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={!canGoBack || listQuery.isFetching}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goNext}
            disabled={nextCursor === null || listQuery.isFetching}
          >
            Next
          </Button>
        </div>
      ) : null}

      <CreateSocietyDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={() => {
          setIsCreateOpen(false);
          void invalidateList();
        }}
      />

      <TransitionDialog
        pending={pending}
        error={actionError}
        isPending={setStatus.isPending}
        onConfirm={confirmTransition}
        onCancel={() => {
          setPending(null);
          setActionError(null);
        }}
      />
    </div>
  );
}

/** The lifecycle buttons available for a society, driven by its current status. */
function RowActions({
  society,
  onTransition,
}: {
  society: AdminSociety;
  onTransition: (transition: PendingTransition) => void;
}) {
  const { publishStatus } = society;

  return (
    <div className="flex items-center justify-end gap-2">
      {publishStatus === SocietyPublishStatus.DRAFT ? (
        <>
          <Button
            size="sm"
            variant="success"
            onClick={() =>
              onTransition({
                society,
                target: SocietyPublishStatus.PUBLISHED,
                verb: "Publish",
              })
            }
          >
            Publish
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              onTransition({
                society,
                target: SocietyPublishStatus.ARCHIVED,
                verb: "Archive",
              })
            }
          >
            Archive
          </Button>
        </>
      ) : null}

      {publishStatus === SocietyPublishStatus.PUBLISHED ? (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              onTransition({
                society,
                target: SocietyPublishStatus.DRAFT,
                verb: "Unpublish",
              })
            }
          >
            Unpublish
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() =>
              onTransition({
                society,
                target: SocietyPublishStatus.ARCHIVED,
                verb: "Archive",
              })
            }
          >
            Archive
          </Button>
        </>
      ) : null}

      {publishStatus === SocietyPublishStatus.ARCHIVED ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            onTransition({
              society,
              target: SocietyPublishStatus.DRAFT,
              verb: "Restore",
            })
          }
        >
          Restore to draft
        </Button>
      ) : null}
    </div>
  );
}

/** Confirm dialog for a lifecycle transition; blocks publish when incomplete. */
function TransitionDialog({
  pending,
  error,
  isPending,
  onConfirm,
  onCancel,
}: {
  pending: PendingTransition | null;
  error: string | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isPublish = pending?.target === SocietyPublishStatus.PUBLISHED;
  const missing = pending?.society.completeness.missing ?? [];
  const blockedByCompleteness = isPublish && missing.length > 0;

  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {pending ? `${pending.verb} ${pending.society.name}?` : ""}
          </DialogTitle>
          <DialogDescription>
            {pending ? transitionCopy(pending) : ""}
          </DialogDescription>
        </DialogHeader>

        {blockedByCompleteness ? (
          <div className="rounded-md border border-warning-border bg-warning-bg p-3">
            <p className="font-sans text-xs font-semibold text-warning-text">
              Complete these required fields before publishing:
            </p>
            <ul className="mt-1.5 list-disc pl-4 font-sans text-xs text-warning-text">
              {missing.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-danger-border bg-danger-bg p-3 font-sans text-xs text-danger-text"
          >
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={
              pending?.target === SocietyPublishStatus.ARCHIVED
                ? "destructive"
                : pending?.target === SocietyPublishStatus.PUBLISHED
                  ? "success"
                  : "primary"
            }
            onClick={onConfirm}
            disabled={isPending || blockedByCompleteness}
          >
            {isPending ? "Working…" : (pending?.verb ?? "Confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function transitionCopy(pending: PendingTransition): string {
  switch (pending.target) {
    case SocietyPublishStatus.PUBLISHED:
      return `This makes ${pending.society.name} visible in the public marketplace and records a SOCIETY_PUBLISHED event in the audit ledger.`;
    case SocietyPublishStatus.ARCHIVED:
      return `This removes ${pending.society.name} from the public marketplace and records a SOCIETY_ARCHIVED event. You can restore it to a draft later.`;
    default:
      return pending.verb === "Unpublish"
        ? `This hides ${pending.society.name} from the marketplace and returns it to draft. It records a ledger event and can be re-published once ready.`
        : `This returns ${pending.society.name} to draft so you can edit and re-publish it.`;
  }
}

/** Create-society wizard: minimal identity fields; always saves a DRAFT. */
function CreateSocietyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [citySlug, setCitySlug] = useState("");
  const [authority, setAuthority] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = api.society.create.useMutation({
    onError: (err) => setError(err.message),
    onSuccess: () => {
      reset();
      onCreated();
    },
  });

  function reset() {
    setName("");
    setSlug("");
    setSlugEdited(false);
    setCitySlug("");
    setAuthority("");
    setError(null);
  }

  const effectiveSlug = slugEdited ? slug : slugify(name);
  const canSubmit =
    name.trim().length > 0 &&
    effectiveSlug.length > 0 &&
    citySlug.length > 0 &&
    authority.length > 0;

  function submit() {
    setError(null);
    if (!canSubmit) {
      setError("Fill in every field before creating the draft.");
      return;
    }
    create.mutate({
      name: name.trim(),
      slug: effectiveSlug,
      citySlug,
      authority,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a society</DialogTitle>
          <DialogDescription>
            This creates a draft. Complete its profile (location, LOP/NOC,
            imagery) afterwards, then publish it from the list.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="society-name">Society name</Label>
            <Input
              id="society-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Bahria Town Phase 8"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="society-slug">URL slug</Label>
            <Input
              id="society-slug"
              value={effectiveSlug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(slugify(event.target.value));
              }}
              placeholder="bahria-town-phase-8"
            />
            <p className="font-sans text-xs text-text-tertiary">
              Lowercase, hyphenated. Must be unique across all societies.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="society-city">City</Label>
              <Select value={citySlug} onValueChange={setCitySlug}>
                <SelectTrigger id="society-city">
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {PAKISTAN_CITIES.map((city) => (
                    <SelectItem key={city.slug} value={city.slug}>
                      {city.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="society-authority">Authority</Label>
              <Select value={authority} onValueChange={setAuthority}>
                <SelectTrigger id="society-authority">
                  <SelectValue placeholder="Select authority" />
                </SelectTrigger>
                <SelectContent>
                  {REGULATORY_AUTHORITIES.map((auth) => (
                    <SelectItem key={auth.code} value={auth.code}>
                      {auth.code} — {auth.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className={cn(
              "rounded-md border border-danger-border bg-danger-bg p-3",
              "font-sans text-xs text-danger-text",
            )}
          >
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending || !canSubmit}>
            {create.isPending ? "Creating…" : "Create draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Slugifies a display name into a URL-safe, hyphenated lowercase slug. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

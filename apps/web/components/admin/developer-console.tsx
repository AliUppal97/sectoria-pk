"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@sectoria/ui";
import { ConfirmDeleteDialog } from "@/components/society/confirm-delete-dialog";
import { api } from "@/lib/trpc/react";

interface DeveloperRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  websiteUrl: string | null;
  foundedYear: number | null;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  year: number | null;
  city: string | null;
}

export function DeveloperConsole({
  initialDevelopers,
}: {
  initialDevelopers: readonly DeveloperRow[];
}) {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<ProjectRow | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [foundedYear, setFoundedYear] = useState("");

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectYear, setProjectYear] = useState("");
  const [projectCity, setProjectCity] = useState("");

  const detailQuery = api.developer.getBySlug.useQuery(
    { slug: selectedSlug ?? "" },
    { enabled: selectedSlug !== null },
  );

  const createDeveloper = api.developer.create.useMutation({
    onSuccess: () => {
      setShowCreate(false);
      setSlug("");
      setName("");
      setDescription("");
      setWebsiteUrl("");
      setFoundedYear("");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const createProject = api.developer.createProject.useMutation({
    onSuccess: () => {
      setProjectName("");
      setProjectDescription("");
      setProjectYear("");
      setProjectCity("");
      void detailQuery.refetch();
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  const deleteProject = api.developer.deleteProject.useMutation({
    onSuccess: () => {
      setDeleteProjectTarget(null);
      void detailQuery.refetch();
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  function handleCreateDeveloper(event: FormEvent) {
    event.preventDefault();
    setError(null);
    createDeveloper.mutate({
      slug: slug.trim(),
      name: name.trim(),
      description: description.trim(),
      websiteUrl: websiteUrl.trim() === "" ? null : websiteUrl.trim(),
      foundedYear:
        foundedYear.trim() === "" ? null : Number.parseInt(foundedYear, 10),
    });
  }

  function handleCreateProject(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const developerId = detailQuery.data?.id;
    if (developerId === undefined) return;
    createProject.mutate({
      developerId,
      name: projectName.trim(),
      description:
        projectDescription.trim() === "" ? null : projectDescription.trim(),
      year:
        projectYear.trim() === "" ? null : Number.parseInt(projectYear, 10),
      city: projectCity.trim() === "" ? null : projectCity.trim(),
    });
  }

  const projects = detailQuery.data?.projects ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-sm text-text-secondary">
          Platform-curated developer profiles and track records.
        </p>
        <Button type="button" onClick={() => setShowCreate(true)}>
          <Plus aria-hidden="true" className="mr-1.5 h-4 w-4" />
          Add developer
        </Button>
      </div>

      {initialDevelopers.length === 0 ? (
        <EmptyState
          icon={Building2}
          heading="No developers yet"
          description="Add the first developer to show credibility on society profiles."
          action={
            <Button type="button" onClick={() => setShowCreate(true)}>
              Add developer
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Founded</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialDevelopers.map((dev) => (
              <TableRow key={dev.id}>
                <TableCell className="font-medium">{dev.name}</TableCell>
                <TableCell>{dev.slug}</TableCell>
                <TableCell>{dev.foundedYear ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSelectedSlug(
                        selectedSlug === dev.slug ? null : dev.slug,
                      )
                    }
                  >
                    {selectedSlug === dev.slug ? "Hide projects" : "Projects"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {selectedSlug !== null && detailQuery.data ? (
        <div className="rounded-xl border border-border-base bg-surface-card p-6">
          <h2 className="font-sans text-md font-semibold text-text-primary">
            Projects — {detailQuery.data.name}
          </h2>
          <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  className="mt-1.5"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="project-city">City (optional)</Label>
                <Input
                  id="project-city"
                  className="mt-1.5"
                  value={projectCity}
                  onChange={(e) => setProjectCity(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="project-description">Description (optional)</Label>
              <textarea
                id="project-description"
                className="mt-1.5 min-h-16 w-full rounded-md border border-border-base bg-surface-card px-3 py-2 font-sans text-sm"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="project-year">Year (optional)</Label>
              <Input
                id="project-year"
                type="number"
                className="mt-1.5 w-32"
                value={projectYear}
                onChange={(e) => setProjectYear(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "Adding…" : "Add project"}
            </Button>
          </form>

          {projects.length === 0 ? (
            <p className="mt-4 font-sans text-sm text-text-secondary">
              No projects in this developer&apos;s track record yet.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="flex items-center justify-between rounded-md border border-border-base bg-surface-subtle px-3 py-2"
                >
                  <div>
                    <p className="font-sans text-sm font-medium">{project.name}</p>
                    {project.city || project.year ? (
                      <p className="font-sans text-xs text-text-tertiary">
                        {[project.city, project.year].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDeleteProjectTarget(project as ProjectRow)
                    }
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {error ? <FieldError>{error}</FieldError> : null}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add developer</DialogTitle>
            <DialogDescription>
              Developer profiles are platform-curated trust data shown on society pages.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDeveloper} className="space-y-4">
            <div>
              <Label htmlFor="dev-slug">Slug</Label>
              <Input
                id="dev-slug"
                className="mt-1.5"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="dev-name">Name</Label>
              <Input
                id="dev-name"
                className="mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="dev-description">Description</Label>
              <textarea
                id="dev-description"
                className="mt-1.5 min-h-24 w-full rounded-md border border-border-base bg-surface-card px-3 py-2 font-sans text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="dev-website">Website (optional)</Label>
              <Input
                id="dev-website"
                type="url"
                className="mt-1.5"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dev-founded">Founded year (optional)</Label>
              <Input
                id="dev-founded"
                type="number"
                className="mt-1.5 w-32"
                value={foundedYear}
                onChange={(e) => setFoundedYear(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDeveloper.isPending}>
                {createDeveloper.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteProjectTarget !== null}
        title="Delete project?"
        description={`Remove "${deleteProjectTarget?.name ?? "this project"}" from the developer track record?`}
        isPending={deleteProject.isPending}
        onCancel={() => setDeleteProjectTarget(null)}
        onConfirm={() => {
          if (deleteProjectTarget) {
            deleteProject.mutate({ projectId: deleteProjectTarget.id });
          }
        }}
      />
    </div>
  );
}

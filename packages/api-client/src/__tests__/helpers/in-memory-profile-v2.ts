import type { Store } from "./in-memory-db.js";

export interface SocietyMediaRow {
  id: string;
  societyId: string;
  kind: string;
  storageKey: string;
  alt: string;
  caption: string | null;
  capturedAt: Date | null;
  sortOrder: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
}

export interface SocietyDocumentRow {
  id: string;
  societyId: string;
  kind: string;
  title: string;
  storageKey: string;
  fileSize: number;
  contentType: string;
  isPublic: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface AmenityFeatureRow {
  id: string;
  societyId: string;
  title: string;
  description: string;
  icon: string | null;
  imageKey: string | null;
  sortOrder: number;
}

export interface SocietyHighlightRow {
  id: string;
  societyId: string;
  label: string;
  value: string;
  icon: string | null;
  sortOrder: number;
}

export interface NearbyLandmarkRow {
  id: string;
  societyId: string;
  name: string;
  category: string;
  distanceKm: string | null;
  driveTimeMins: number | null;
  sortOrder: number;
}

export interface DeveloperRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoKey: string | null;
  websiteUrl: string | null;
  foundedYear: number | null;
  createdAt: Date;
}

export interface DeveloperProjectRow {
  id: string;
  developerId: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  year: number | null;
  city: string | null;
  sortOrder: number;
}

export interface SocietyMilestoneRow {
  id: string;
  societyId: string;
  title: string;
  description: string | null;
  occurredOn: Date;
  status: string;
  sortOrder: number;
}

export interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverKey: string | null;
  authorName: string;
  publishedAt: Date | null;
  isPublished: boolean;
  societyId: string | null;
  developerId: string | null;
  createdAt: Date;
}

export interface ProfileV2Store {
  societyMedia: Map<string, SocietyMediaRow>;
  societyDocument: Map<string, SocietyDocumentRow>;
  amenityFeature: Map<string, AmenityFeatureRow>;
  societyHighlight: Map<string, SocietyHighlightRow>;
  nearbyLandmark: Map<string, NearbyLandmarkRow>;
  developer: Map<string, DeveloperRow>;
  developerProject: Map<string, DeveloperProjectRow>;
  societyMilestone: Map<string, SocietyMilestoneRow>;
  article: Map<string, ArticleRow>;
  nextProfileId: (prefix: string) => string;
}

export function createProfileV2Store(): ProfileV2Store {
  const counters = new Map<string, number>();
  return {
    societyMedia: new Map(),
    societyDocument: new Map(),
    amenityFeature: new Map(),
    societyHighlight: new Map(),
    nearbyLandmark: new Map(),
    developer: new Map(),
    developerProject: new Map(),
    societyMilestone: new Map(),
    article: new Map(),
    nextProfileId(prefix: string) {
      const next = (counters.get(prefix) ?? 0) + 1;
      counters.set(prefix, next);
      return `${prefix}_${next}`;
    },
  };
}

function matchesWhere<T>(
  row: T,
  where?: Record<string, unknown>,
): boolean {
  if (where === undefined) return true;
  for (const [key, expected] of Object.entries(where)) {
    if (expected === undefined) continue;
    if ((row as Record<string, unknown>)[key] !== expected) return false;
  }
  return true;
}

function sortRows<T>(
  rows: T[],
  orderBy: unknown,
): T[] {
  const clauses = Array.isArray(orderBy)
    ? (orderBy as Record<string, "asc" | "desc">[])
    : orderBy !== undefined && orderBy !== null
      ? [orderBy as Record<string, "asc" | "desc">]
      : [];
  if (clauses.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const clause of clauses) {
      for (const [field, direction] of Object.entries(clause)) {
        const av = (a as Record<string, unknown>)[field];
        const bv = (b as Record<string, unknown>)[field];
        const cmp =
          av instanceof Date && bv instanceof Date
            ? av.getTime() - bv.getTime()
            : String(av).localeCompare(String(bv));
        if (cmp !== 0) return direction === "desc" ? -cmp : cmp;
      }
    }
    return 0;
  });
}

function makeSocietyOwnedCrud<T extends { id: string; societyId: string }>(
  map: Map<string, T>,
  idPrefix: string,
  nextId: (prefix: string) => string,
) {
  return {
    findMany: async (args?: {
      where?: Record<string, unknown>;
      orderBy?: unknown;
      select?: { id?: boolean };
    }) => {
      let rows = [...map.values()].filter((row) =>
        matchesWhere(row, args?.where),
      );
      rows = sortRows(rows, args?.orderBy);
      if (args?.select?.id) {
        return rows.map((row) => ({ id: row.id }));
      }
      return rows;
    },
    findUnique: async (args: {
      where: { id: string };
      select?: { societyId?: boolean };
    }) => {
      const row = map.get(args.where.id) ?? null;
      if (row === null) return null;
      if (args.select?.societyId) return { societyId: row.societyId };
      return row;
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const id = nextId(idPrefix);
      const row = {
        id,
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
        ...args.data,
      } as unknown as T;
      map.set(id, row);
      return row;
    },
    update: async (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = map.get(args.where.id);
      if (row === undefined) throw new Error(`${idPrefix} not found`);
      Object.assign(row, args.data);
      return row;
    },
    delete: async (args: { where: { id: string } }) => {
      const row = map.get(args.where.id);
      if (row === undefined) throw new Error(`${idPrefix} not found`);
      map.delete(args.where.id);
      return row;
    },
  };
}

/** Attaches society profile v2 model delegates to the in-memory Prisma client. */
export function attachProfileV2Models(
  client: Record<string, unknown>,
  store: Store,
  profile: ProfileV2Store,
): void {
  const nextId = profile.nextProfileId;

  client.societyMedia = {
    ...makeSocietyOwnedCrud(
      profile.societyMedia,
      "media",
      nextId,
    ),
  };

  client.societyDocument = {
    ...makeSocietyOwnedCrud(
      profile.societyDocument,
      "doc",
      nextId,
    ),
  };

  client.amenityFeature = {
    ...makeSocietyOwnedCrud(
      profile.amenityFeature,
      "amenity",
      nextId,
    ),
  };

  client.societyHighlight = {
    ...makeSocietyOwnedCrud(
      profile.societyHighlight,
      "highlight",
      nextId,
    ),
  };

  client.nearbyLandmark = {
    ...makeSocietyOwnedCrud(
      profile.nearbyLandmark,
      "landmark",
      nextId,
    ),
  };

  client.societyMilestone = {
    ...makeSocietyOwnedCrud(
      profile.societyMilestone,
      "milestone",
      nextId,
    ),
  };

  client.developer = {
    findMany: async (args?: { orderBy?: unknown }) => {
      const rows = sortRows([...profile.developer.values()], args?.orderBy);
      return rows;
    },
    findUnique: async (args: {
      where: { id?: string; slug?: string };
      include?: {
        projects?: { orderBy?: unknown };
        societies?: {
          where?: { publishStatus?: string };
          select?: Record<string, boolean>;
        };
      };
    }) => {
      const row =
        args.where.id !== undefined
          ? (profile.developer.get(args.where.id) ?? null)
          : ([...profile.developer.values()].find(
              (d) => d.slug === args.where.slug,
            ) ?? null);
      if (row === null) return null;
      const result: Record<string, unknown> = { ...row };
      if (args.include?.projects !== undefined) {
        const projects = sortRows(
          [...profile.developerProject.values()].filter(
            (p) => p.developerId === row.id,
          ),
          args.include.projects.orderBy,
        );
        result.projects = projects;
      }
      if (args.include?.societies !== undefined) {
        const publishFilter = args.include.societies.where?.publishStatus;
        result.societies = [...store.societies.values()]
          .filter((s) => {
            const linked =
              (s as unknown as { developerId?: string }).developerId ===
              row.id;
            if (!linked) return false;
            if (publishFilter === undefined) return true;
            return s.publishStatus === publishFilter;
          })
          .map((s) => ({
            id: s.id,
            slug: s.slug,
            name: s.name,
            city: s.city,
            citySlug: s.citySlug,
            verificationTier: s.verificationTier,
          }));
      }
      return result;
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const id = nextId("dev");
      const row: DeveloperRow = {
        id,
        slug: String(args.data.slug),
        name: String(args.data.name),
        description: String(args.data.description),
        logoKey: (args.data.logoKey as string | null) ?? null,
        websiteUrl: (args.data.websiteUrl as string | null) ?? null,
        foundedYear: (args.data.foundedYear as number | null) ?? null,
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
      };
      profile.developer.set(id, row);
      return row;
    },
    update: async (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = profile.developer.get(args.where.id);
      if (row === undefined) throw new Error("developer not found");
      Object.assign(row, args.data);
      return row;
    },
  };

  client.developerProject = {
    findUnique: async (args: { where: { id: string } }) =>
      profile.developerProject.get(args.where.id) ?? null,
    create: async (args: { data: Record<string, unknown> }) => {
      const id = nextId("proj");
      const row: DeveloperProjectRow = {
        id,
        developerId: String(args.data.developerId),
        name: String(args.data.name),
        description: (args.data.description as string | null) ?? null,
        imageKey: (args.data.imageKey as string | null) ?? null,
        year: (args.data.year as number | null) ?? null,
        city: (args.data.city as string | null) ?? null,
        sortOrder: Number(args.data.sortOrder ?? 0),
      };
      profile.developerProject.set(id, row);
      return row;
    },
    update: async (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = profile.developerProject.get(args.where.id);
      if (row === undefined) throw new Error("project not found");
      Object.assign(row, args.data);
      return row;
    },
    delete: async (args: { where: { id: string } }) => {
      profile.developerProject.delete(args.where.id);
      return { id: args.where.id };
    },
  };

  client.article = {
    findMany: async (args?: {
      where?: Record<string, unknown>;
      orderBy?: unknown;
      take?: number;
    }) => {
      let rows = [...profile.article.values()].filter((row) =>
        matchesWhere(row, args?.where),
      );
      rows = sortRows(rows, args?.orderBy);
      if (typeof args?.take === "number") rows = rows.slice(0, args.take);
      return rows;
    },
    findUnique: async (args: { where: { id?: string; slug?: string } }) => {
      if (args.where.id !== undefined) {
        return profile.article.get(args.where.id) ?? null;
      }
      return (
        [...profile.article.values()].find((a) => a.slug === args.where.slug) ??
        null
      );
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const id = nextId("article");
      const row: ArticleRow = {
        id,
        slug: String(args.data.slug),
        title: String(args.data.title),
        excerpt: String(args.data.excerpt),
        body: String(args.data.body),
        coverKey: (args.data.coverKey as string | null) ?? null,
        authorName: String(args.data.authorName),
        publishedAt: (args.data.publishedAt as Date | null) ?? null,
        isPublished: Boolean(args.data.isPublished ?? false),
        societyId: (args.data.societyId as string | null) ?? null,
        developerId: (args.data.developerId as string | null) ?? null,
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
      };
      profile.article.set(id, row);
      return row;
    },
    update: async (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = profile.article.get(args.where.id);
      if (row === undefined) throw new Error("article not found");
      Object.assign(row, args.data);
      return row;
    },
    delete: async (args: { where: { id: string } }) => {
      profile.article.delete(args.where.id);
      return { id: args.where.id };
    },
  };
}

export type { Store };

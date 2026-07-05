import {
  amenityFeatureSchema,
  articleSchema,
  developerProjectSchema,
  developerSchema,
  nearbyLandmarkSchema,
  societyDocumentSchema,
  societyHighlightSchema,
  societyMediaSchema,
  societyMilestoneSchema,
  type AmenityFeature,
  type Article,
  type Developer,
  type DeveloperProject,
  type NearbyLandmark,
  type SocietyDocument,
  type SocietyHighlight,
  type SocietyMedia,
  type SocietyMilestone,
} from "@sectoria/types";
import { getPublicUrl, getSignedDownloadUrl } from "./resolve-storage-url.js";

/** Fields that must never appear in buyer-facing payloads. */
export const FORBIDDEN_BUYER_FIELDS = [
  "dealerNetPkr",
  "spreadPkr",
  "commission",
  "commissionSplitPct",
  "dealerPhone",
  "dealerEmail",
  "dealerContact",
] as const;

function serializeDate(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function serializeDecimal(
  value: { toString(): string } | string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : value.toString();
}

/** Public media DTO — storage key resolved to a CDN URL. */
export function toMediaPublicDto(row: {
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
}): SocietyMedia & { url: string } {
  const dto = societyMediaSchema.parse({
    id: row.id,
    societyId: row.societyId,
    kind: row.kind,
    storageKey: row.storageKey,
    alt: row.alt,
    caption: row.caption,
    capturedAt: serializeDate(row.capturedAt),
    sortOrder: row.sortOrder,
    width: row.width,
    height: row.height,
    createdAt: serializeDate(row.createdAt),
  });
  return { ...dto, url: getPublicUrl(row.storageKey) };
}

/** Admin media DTO — includes storage key for editing. */
export function toMediaAdminDto(row: Parameters<typeof toMediaPublicDto>[0]) {
  return societyMediaSchema.parse({
    id: row.id,
    societyId: row.societyId,
    kind: row.kind,
    storageKey: row.storageKey,
    alt: row.alt,
    caption: row.caption,
    capturedAt: serializeDate(row.capturedAt),
    sortOrder: row.sortOrder,
    width: row.width,
    height: row.height,
    createdAt: serializeDate(row.createdAt),
  });
}

/** Public document DTO — signed URL, no storage key on the wire. */
export function toDocumentPublicDto(row: {
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
}): Omit<SocietyDocument, "storageKey"> & { url: string } {
  const { storageKey, ...rest } = societyDocumentSchema.parse({
    id: row.id,
    societyId: row.societyId,
    kind: row.kind,
    title: row.title,
    storageKey: row.storageKey,
    fileSize: row.fileSize,
    contentType: row.contentType,
    isPublic: row.isPublic,
    sortOrder: row.sortOrder,
    createdAt: serializeDate(row.createdAt),
  });
  void storageKey;
  return {
    ...rest,
    url: getSignedDownloadUrl(row.storageKey),
  };
}

/** Admin document DTO — includes storage key; private docs omit URL until minted. */
export function toDocumentAdminDto(
  row: Parameters<typeof toDocumentPublicDto>[0],
  options: { includeUrl?: boolean } = {},
) {
  const dto = societyDocumentSchema.parse({
    id: row.id,
    societyId: row.societyId,
    kind: row.kind,
    title: row.title,
    storageKey: row.storageKey,
    fileSize: row.fileSize,
    contentType: row.contentType,
    isPublic: row.isPublic,
    sortOrder: row.sortOrder,
    createdAt: serializeDate(row.createdAt),
  });
  if (options.includeUrl) {
    return { ...dto, url: getSignedDownloadUrl(row.storageKey) };
  }
  return dto;
}

export function toAmenityDto(row: {
  id: string;
  societyId: string;
  title: string;
  description: string;
  icon: string | null;
  imageKey: string | null;
  sortOrder: number;
}): AmenityFeature {
  return amenityFeatureSchema.parse({
    id: row.id,
    societyId: row.societyId,
    title: row.title,
    description: row.description,
    icon: row.icon,
    imageKey: row.imageKey,
    sortOrder: row.sortOrder,
  });
}

export function toHighlightDto(row: {
  id: string;
  societyId: string;
  label: string;
  value: string;
  icon: string | null;
  sortOrder: number;
}): SocietyHighlight {
  return societyHighlightSchema.parse({
    id: row.id,
    societyId: row.societyId,
    label: row.label,
    value: row.value,
    icon: row.icon,
    sortOrder: row.sortOrder,
  });
}

export function toLandmarkDto(row: {
  id: string;
  societyId: string;
  name: string;
  category: string;
  distanceKm: { toString(): string } | string | null;
  driveTimeMins: number | null;
  sortOrder: number;
}): NearbyLandmark {
  return nearbyLandmarkSchema.parse({
    id: row.id,
    societyId: row.societyId,
    name: row.name,
    category: row.category,
    distanceKm: serializeDecimal(row.distanceKm),
    driveTimeMins: row.driveTimeMins,
    sortOrder: row.sortOrder,
  });
}

export function toDeveloperDto(row: {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoKey: string | null;
  websiteUrl: string | null;
  foundedYear: number | null;
  createdAt: Date;
}): Developer {
  return developerSchema.parse({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    logoKey: row.logoKey,
    websiteUrl: row.websiteUrl,
    foundedYear: row.foundedYear,
    createdAt: serializeDate(row.createdAt),
  });
}

export function toDeveloperProjectDto(row: {
  id: string;
  developerId: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  year: number | null;
  city: string | null;
  sortOrder: number;
}): DeveloperProject {
  return developerProjectSchema.parse({
    id: row.id,
    developerId: row.developerId,
    name: row.name,
    description: row.description,
    imageKey: row.imageKey,
    year: row.year,
    city: row.city,
    sortOrder: row.sortOrder,
  });
}

export function toMilestoneDto(row: {
  id: string;
  societyId: string;
  title: string;
  description: string | null;
  occurredOn: Date;
  status: string;
  sortOrder: number;
}): SocietyMilestone {
  return societyMilestoneSchema.parse({
    id: row.id,
    societyId: row.societyId,
    title: row.title,
    description: row.description,
    occurredOn: serializeDate(row.occurredOn),
    status: row.status,
    sortOrder: row.sortOrder,
  });
}

export function toArticleDto(row: {
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
}): Article {
  return articleSchema.parse({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    coverKey: row.coverKey,
    authorName: row.authorName,
    publishedAt: serializeDate(row.publishedAt),
    isPublished: row.isPublished,
    societyId: row.societyId,
    developerId: row.developerId,
    createdAt: serializeDate(row.createdAt),
  });
}

/** Asserts a serialized payload contains no dealer-sensitive fields. */
export function assertNoForbiddenBuyerFields(payload: unknown): void {
  const json = JSON.stringify(payload);
  for (const field of FORBIDDEN_BUYER_FIELDS) {
    if (json.includes(`"${field}"`)) {
      throw new Error(`Forbidden buyer-facing field leaked: ${field}`);
    }
  }
}

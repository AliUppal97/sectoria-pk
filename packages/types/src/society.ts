import { z } from "zod";
import {
  decimalStringSchema,
  idSchema,
  isoDateTimeSchema,
  latitudeSchema,
  longitudeSchema,
  slugSchema,
} from "./common.js";
import {
  geoJsonBoundarySchema,
  societyBookingStatusSchema,
} from "./society-update.js";

/**
 * Trust ladder for a society. `VERIFIED` means LOP + NOC documents are
 * confirmed; `HSMS_LINKED` additionally has a live HSMS integration.
 * Mirrors the Prisma `VerificationTier` enum.
 *
 * Domain vocabulary:
 * - `lop` — Layout Plan approval reference.
 * - `noc` — No Objection Certificate reference.
 * - `hsms` — Housing Society Management System.
 */
export const VerificationTier = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  HSMS_LINKED: "HSMS_LINKED",
} as const;
export type VerificationTier =
  (typeof VerificationTier)[keyof typeof VerificationTier];
export const verificationTierSchema = z.nativeEnum(VerificationTier);

/**
 * Publication lifecycle for a society (M0). A society is created as `DRAFT`,
 * filled in incrementally, and only becomes publicly visible once it is
 * `PUBLISHED`. `ARCHIVED` delists it while retaining the row for history/audit.
 *
 * Every public read filters `publishStatus = PUBLISHED`, which is what lets ops
 * onboard societies one-by-one without exposing half-entered profiles. Mirrors
 * the Prisma `SocietyPublishStatus` enum.
 */
export const SocietyPublishStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;
export type SocietyPublishStatus =
  (typeof SocietyPublishStatus)[keyof typeof SocietyPublishStatus];
export const societyPublishStatusSchema = z.nativeEnum(SocietyPublishStatus);

/** A verified housing society — the seller of record on the marketplace. */
export const societySchema = z.object({
  id: idSchema,
  slug: slugSchema,
  name: z.string().min(1),
  city: z.string().min(1),
  citySlug: slugSchema,
  /** Issuing development authority, e.g. "CDA", "LDA", "RDA". */
  authority: z.string().min(1),
  lopReferenceNo: z.string().nullable().optional(),
  nocReferenceNo: z.string().nullable().optional(),
  hsmsLinked: z.boolean(),
  verificationTier: verificationTierSchema,
  description: z.string(),
  amenities: z.array(z.string()),
  latitude: latitudeSchema.nullable().optional(),
  longitude: longitudeSchema.nullable().optional(),
  /** Human-readable stage, e.g. "Under Development", "Possession Underway". */
  developmentStage: z.string().min(1),
  /** Completion percentage, 0–100. */
  developmentPct: z.number().int().min(0).max(100),
  heroImageUrl: z.string().url().nullable().optional(),
  addressLine: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  /** Official total project land in kanal (Punjab standard: 1 kanal = 5445 sq ft). */
  totalLandKanal: decimalStringSchema.nullable().optional(),
  developedLandKanal: decimalStringSchema.nullable().optional(),
  boundaryGeoJson: geoJsonBoundarySchema.nullable().optional(),
  bookingStatus: societyBookingStatusSchema,
  bookingOpensAt: isoDateTimeSchema.nullable().optional(),
  bookingClosesAt: isoDateTimeSchema.nullable().optional(),
  /** Publication lifecycle (M0). New societies start as `DRAFT`. */
  publishStatus: societyPublishStatusSchema,
  /** When the society was first published to the marketplace, if ever. */
  publishedAt: isoDateTimeSchema.nullable().optional(),
  /** The ops/admin user who created the record — for audit and ownership. */
  createdById: idSchema.nullable().optional(),
  createdAt: isoDateTimeSchema,
});
export type Society = z.infer<typeof societySchema>;

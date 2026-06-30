import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common.js";

/**
 * Platform roles. Mirrors the `UserRole` enum in `schema.prisma` exactly —
 * the two must never drift apart. The `as const` object (rather than a TS
 * `enum`) is the convention for value sets that cross the client/server
 * boundary, per `oop-and-domain-modeling.mdc`.
 */
export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SOCIETY_ADMIN: "SOCIETY_ADMIN",
  DEALER_PARTNER: "DEALER_PARTNER",
  SALES_ADVISOR: "SALES_ADVISOR",
  BUYER: "BUYER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export const userRoleSchema = z.nativeEnum(UserRole);

/**
 * FBR Active Taxpayer List status. Drives tax rates in
 * `packages/domain/tax` — a non-filer pays materially higher advance tax.
 */
export const AtlStatus = {
  FILER: "FILER",
  LATE_FILER: "LATE_FILER",
  NON_FILER: "NON_FILER",
} as const;
export type AtlStatus = (typeof AtlStatus)[keyof typeof AtlStatus];
export const atlStatusSchema = z.nativeEnum(AtlStatus);

/**
 * A platform user. `cnicEncrypted`/`ntnEncrypted` hold ciphertext only —
 * the raw `Cnic`/`Ntn` values are never stored or carried on this shape
 * (see `security.mdc`), which is why these are plain strings, not the
 * branded `cnicSchema`/`ntnSchema`.
 */
export const userSchema = z.object({
  id: idSchema,
  email: z.string().email().nullable().optional(),
  phone: z.string().min(1),
  cnicEncrypted: z.string().nullable().optional(),
  ntnEncrypted: z.string().nullable().optional(),
  name: z.string().min(1),
  role: userRoleSchema,
  atlStatus: atlStatusSchema,
  atlVerifiedAt: isoDateTimeSchema.nullable().optional(),
  nadraVerified: z.boolean(),
  /** 0–100 trust score; null until first computed. */
  trustScore: z.number().min(0).max(100).nullable().optional(),
  societyId: idSchema.nullable().optional(),
  createdAt: isoDateTimeSchema,
});
export type User = z.infer<typeof userSchema>;

import { z } from "zod";
import { cnicSchema, idSchema, isoDateTimeSchema, ntnSchema } from "./common.js";
import { atlStatusSchema } from "./user.js";

/**
 * Response shapes for the government-integration adapters in
 * `packages/verification`. These cross a network boundary, so each gets a
 * Zod schema (see `json-and-config-conventions.mdc`) — adapter responses
 * are parsed, never trusted via untyped property access.
 */

/** Result of a NADRA CNIC identity check. */
export const nadraVerificationResultSchema = z.object({
  verified: z.boolean(),
  cnic: cnicSchema,
  fullName: z.string().optional(),
  fatherName: z.string().optional(),
  /** Date of birth as an ISO 8601 timestamp. */
  dateOfBirth: isoDateTimeSchema.optional(),
  /** Biometric match confidence in the range 0–1. */
  biometricConfidence: z.number().min(0).max(1),
  verifiedAt: isoDateTimeSchema,
});
export type NadraVerificationResult = z.infer<
  typeof nadraVerificationResultSchema
>;

/** Result of an FBR Active Taxpayer List lookup. */
export const atlStatusResultSchema = z.object({
  cnic: cnicSchema,
  ntn: ntnSchema.optional(),
  atlStatus: atlStatusSchema,
  isActiveTaxpayer: z.boolean(),
  checkedAt: isoDateTimeSchema,
});
export type AtlStatusResult = z.infer<typeof atlStatusResultSchema>;

/** Result of a DNFBP dealer-certificate spot check. */
export const dnfbpVerificationResultSchema = z.object({
  certNumber: z.string().min(1),
  verified: z.boolean(),
  agencyName: z.string().optional(),
  expiresAt: isoDateTimeSchema.optional(),
  checkedAt: isoDateTimeSchema,
});
export type DnfbpVerificationResult = z.infer<
  typeof dnfbpVerificationResultSchema
>;

/** A PLRA property certificate issued for a completed transfer. */
export const plraCertificateSchema = z.object({
  transferId: idSchema,
  certificateNumber: z.string().min(1),
  issuedAt: isoDateTimeSchema,
  /** URL to the rendered certificate document, when available. */
  documentUrl: z.string().url().optional(),
});
export type PlraCertificate = z.infer<typeof plraCertificateSchema>;

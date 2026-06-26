import { z } from "zod";
import { decimalStringSchema, idSchema } from "./common.js";

/** Whether a dealer's authorization to sell for a society is live. */
export const AuthorizationStatus = {
  ACTIVE: "ACTIVE",
  REVOKED: "REVOKED",
} as const;
export type AuthorizationStatus =
  (typeof AuthorizationStatus)[keyof typeof AuthorizationStatus];
export const authorizationStatusSchema = z.nativeEnum(AuthorizationStatus);

/**
 * Grants a dealer the right to sell a society's inventory. A null
 * `categoryId` means the authorization covers every category in the
 * society. `commissionSplitPct` is a decimal string to keep the split
 * exact.
 */
export const societyPartnerAuthorizationSchema = z.object({
  id: idSchema,
  societyId: idSchema,
  dealerId: idSchema,
  categoryId: idSchema.nullable().optional(),
  commissionSplitPct: decimalStringSchema,
  status: authorizationStatusSchema,
});
export type SocietyPartnerAuthorization = z.infer<
  typeof societyPartnerAuthorizationSchema
>;

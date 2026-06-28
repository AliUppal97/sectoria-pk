import { z } from "zod";
import { cnicSchema, ntnSchema, LedgerEventType } from "@sectoria/types";
import { encrypt } from "@sectoria/database";
import { createLedgerEvent } from "@sectoria/domain-ledger";
import { router } from "../trpc.js";
import { protectedProcedure } from "../procedures.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { mapDomainError } from "../lib/map-domain-error.js";
import { persistLedgerEvent } from "../lib/persist-ledger-event.js";
import { toId } from "../lib/ids.js";

/**
 * Verification procedures — the only place the government adapters
 * (`ctx.verification`) are invoked from. UI never calls an adapter directly
 * (see `verification-adapters.mdc`).
 *
 * Both procedures are rate-limited (these trigger outbound government calls — a
 * cost/abuse surface, per `security.mdc`) and both treat the caller's own CNIC
 * as PII: the raw value is encrypted before storage via the field-level helper
 * and is never written to the ledger payload or returned in the response.
 */
export const verificationRouter = router({
  /**
   * Runs a NADRA CNIC identity check for the calling user, stores the encrypted
   * CNIC and the verified flag, and records a `VERIFICATION_COMPLETED` audit
   * event — all in one transaction. Returns only non-PII result fields.
   */
  verifyCnic: protectedProcedure
    .use(rateLimit({ scope: "verification:nadra" }))
    .input(z.object({ cnic: cnicSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.verification.nadra.verifyCnic(input.cnic);

        if (result.verified) {
          const event = createLedgerEvent({
            id: toId(ctx.generateId()),
            type: LedgerEventType.VERIFICATION_COMPLETED,
            entityId: ctx.session.user.id,
            // The CNIC itself is PII and is deliberately absent from the payload.
            payload: { kind: "NADRA", verified: true },
            actor: {
              actorId: ctx.session.user.id,
              actorRole: ctx.session.user.role,
            },
            createdAt: ctx.now().toISOString(),
          });

          await ctx.db.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: ctx.session.user.id },
              data: {
                nadraVerified: true,
                cnicEncrypted: encrypt(input.cnic),
              },
            });
            await persistLedgerEvent(tx, event);
          });
        }

        return {
          verified: result.verified,
          fullName: result.fullName,
          biometricConfidence: result.biometricConfidence,
          verifiedAt: result.verifiedAt,
        };
      } catch (error) {
        throw mapDomainError(error);
      }
    }),

  /**
   * Looks up the caller's FBR Active Taxpayer List status, persists the result
   * (and the encrypted NTN when supplied), and returns the non-PII fields. ATL
   * status drives advance-tax rates, so this keeps the user's tax profile current.
   */
  checkAtlStatus: protectedProcedure
    .use(rateLimit({ scope: "verification:fbr" }))
    .input(z.object({ cnic: cnicSchema, ntn: ntnSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.verification.fbrAtl.getAtlStatus(
          input.cnic,
          input.ntn,
        );

        await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: {
            atlStatus: result.atlStatus,
            atlVerifiedAt: new Date(result.checkedAt),
            ...(input.ntn !== undefined
              ? { ntnEncrypted: encrypt(input.ntn) }
              : {}),
          },
        });

        return {
          atlStatus: result.atlStatus,
          isActiveTaxpayer: result.isActiveTaxpayer,
          checkedAt: result.checkedAt,
        };
      } catch (error) {
        throw mapDomainError(error);
      }
    }),
});

import { z } from "zod";
import {
  AuthorizationStatus,
  decimalStringSchema,
  idSchema,
  slugSchema,
} from "@sectoria/types";
import { calculateTrustScore } from "@sectoria/domain-trust-score";
import { router, TRPCError } from "../trpc.js";
import {
  dealerProcedure,
  publicProcedure,
  societyAdminProcedure,
} from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";
import { mapDomainError } from "../lib/map-domain-error.js";

/**
 * Dealer procedures: public profile + trust score, the dealer's own DNFBP
 * verification, and the society-side authorization controls. The trust score is
 * computed by the pure `@sectoria/domain-trust-score` function from persisted
 * signals — never re-implemented here.
 */
export const dealerRouter = router({
  /** Public dealer profile by slug. */
  getBySlug: publicProcedure
    .input(z.object({ slug: slugSchema }))
    .query(async ({ ctx, input }) => {
      const dealer = await ctx.db.dealerProfile.findUnique({
        where: { slug: input.slug },
      });
      if (dealer === null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dealer not found." });
      }
      return dealer;
    }),

  /**
   * Computes a dealer's 0–100 trust score from persisted signals (verified
   * completed deals, post-transaction review average, DNFBP verification). The
   * weighting and anti-gaming guarantee live in the domain function.
   */
  trustScore: publicProcedure
    .input(z.object({ dealerId: idSchema }))
    .query(async ({ ctx, input }) => {
      try {
        const dealer = await ctx.db.dealerProfile.findUnique({
          where: { id: input.dealerId },
          select: { userId: true, dnfbpVerified: true, completedDeals: true },
        });
        if (dealer === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dealer not found.",
          });
        }

        const ratings = await ctx.db.review.aggregate({
          where: { subjectUserId: dealer.userId },
          _avg: { rating: true },
        });

        return calculateTrustScore({
          verifiedTransactionCount: dealer.completedDeals,
          averageBuyerRating: ratings._avg.rating ?? null,
          // Response-time tracking isn't wired yet; a neutral percentile avoids
          // unfairly crediting or penalising a dealer for an unmeasured signal.
          responseTimePercentile: 50,
          verificationCompleteness: dealer.dnfbpVerified ? 1 : 0,
          disputes: { resolved: 0, unresolved: 0 },
        });
      } catch (error) {
        throw mapDomainError(error);
      }
    }),

  /**
   * Spot-checks the calling dealer's own DNFBP certificate via the adapter and
   * stores the verified flag. A dealer can only verify their own profile — the
   * profile is looked up by the session user id, never taken from input.
   */
  submitDnfbpCertificate: dealerProcedure
    .input(z.object({ certNumber: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const dealer = await ctx.db.dealerProfile.findUnique({
          where: { userId: ctx.session.user.id },
          select: { id: true },
        });
        if (dealer === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "You do not have a dealer profile.",
          });
        }

        const result = await ctx.verification.dnfbp.verifyDnfbpCertificate(
          input.certNumber,
        );

        await ctx.db.dealerProfile.update({
          where: { id: dealer.id },
          data: {
            dnfbpCertNumber: input.certNumber,
            dnfbpVerified: result.verified,
          },
        });

        return { verified: result.verified, checkedAt: result.checkedAt };
      } catch (error) {
        throw mapDomainError(error);
      }
    }),

  /**
   * Authorizes a dealer to sell a society's inventory (optionally scoped to one
   * category). Restricted to the owning society's administrator. Re-authorizing
   * an existing pair reactivates it rather than creating a duplicate.
   */
  authorizePartner: societyAdminProcedure
    .input(
      z.object({
        societyId: idSchema,
        dealerId: idSchema,
        categoryId: idSchema.nullable().optional(),
        commissionSplitPct: decimalStringSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const categoryId = input.categoryId ?? null;

      // A nullable `categoryId` can't be matched through the compound-unique key
      // (Postgres treats NULLs as distinct), so reactivation is a find-then-write
      // rather than an upsert-by-key.
      const existing = await ctx.db.societyPartnerAuthorization.findFirst({
        where: {
          societyId: input.societyId,
          dealerId: input.dealerId,
          categoryId,
        },
        select: { id: true },
      });

      if (existing !== null) {
        return ctx.db.societyPartnerAuthorization.update({
          where: { id: existing.id },
          data: {
            commissionSplitPct: input.commissionSplitPct,
            status: AuthorizationStatus.ACTIVE,
          },
        });
      }

      return ctx.db.societyPartnerAuthorization.create({
        data: {
          societyId: input.societyId,
          dealerId: input.dealerId,
          categoryId,
          commissionSplitPct: input.commissionSplitPct,
          status: AuthorizationStatus.ACTIVE,
        },
      });
    }),

  /** Revokes a dealer's authorization. Restricted to the owning society's admin. */
  revokePartner: societyAdminProcedure
    .input(z.object({ authorizationId: idSchema }))
    .mutation(async ({ ctx, input }) => {
      const authorization = await ctx.db.societyPartnerAuthorization.findUnique({
        where: { id: input.authorizationId },
        select: { id: true, societyId: true },
      });
      if (authorization === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Authorization not found.",
        });
      }
      assertSocietyOwnership(ctx.session, authorization.societyId);

      return ctx.db.societyPartnerAuthorization.update({
        where: { id: authorization.id },
        data: { status: AuthorizationStatus.REVOKED },
      });
    }),
});

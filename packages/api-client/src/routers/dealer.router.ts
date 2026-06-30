import { z } from "zod";
import {
  AuthorizationStatus,
  decimalStringSchema,
  idSchema,
  slugSchema,
} from "@sectoria/types";
import { calculateTrustScore } from "@sectoria/domain-trust-score";
import { router, TRPCError, type TRPCContext } from "../trpc.js";
import {
  dealerProcedure,
  publicProcedure,
  societyAdminProcedure,
} from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";
import { resolveOwnedSocietyId } from "../middleware/resolve-owned-society-id.js";
import { mapDomainError } from "../lib/map-domain-error.js";
import { resolveAuthorizedCategoryIds } from "../lib/dealer-authorization.js";

/**
 * Dealer procedures: public profile + trust score, the dealer's own DNFBP
 * verification, and the society-side authorization controls. The trust score is
 * computed by the pure `@sectoria/domain-trust-score` function from persisted
 * signals — never re-implemented here.
 */
export const dealerRouter = router({
  /**
   * Public dealer directory. Reads are public so the verified-dealer list is
   * crawlable. Optionally narrows to DNFBP-verified dealers only; ordered by
   * completed deals (the strongest trust signal) then agency name.
   */
  list: publicProcedure
    .input(
      z
        .object({
          verifiedOnly: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.dealerProfile.findMany({
        where:
          input?.verifiedOnly === true ? { dnfbpVerified: true } : undefined,
        orderBy: [{ completedDeals: "desc" }, { agencyName: "asc" }],
      });
    }),

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
        return await loadDealerTrustScore(ctx, input.dealerId);
      } catch (error) {
        throw mapDomainError(error);
      }
    }),

  /** The calling dealer's profile. Scoped to the session user — never from input. */
  getMyProfile: dealerProcedure.query(async ({ ctx }) => {
    const dealer = await ctx.db.dealerProfile.findUnique({
      where: { userId: ctx.session.user.id },
    });
    if (dealer === null) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "You do not have a dealer profile.",
      });
    }
    return dealer;
  }),

  /**
   * Trust score for the calling dealer, computed by the pure domain function from
   * persisted signals — same output as the public `trustScore` procedure.
   */
  getMyTrustScore: dealerProcedure.query(async ({ ctx }) => {
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

    try {
      return await loadDealerTrustScore(ctx, dealer.id);
    } catch (error) {
      throw mapDomainError(error);
    }
  }),

  /**
   * Dashboard metrics for the dealer portal: authorization scope, lead count,
   * DNFBP status, and trust score.
   */
  getPortalOverview: dealerProcedure.query(async ({ ctx }) => {
    const dealer = await ctx.db.dealerProfile.findUnique({
      where: { userId: ctx.session.user.id },
      select: {
        id: true,
        slug: true,
        agencyName: true,
        dnfbpCertNumber: true,
        dnfbpVerified: true,
        completedDeals: true,
        authorizations: {
          where: { status: AuthorizationStatus.ACTIVE },
          select: {
            society: { select: { id: true, name: true, slug: true, citySlug: true } },
          },
        },
      },
    });
    if (dealer === null) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "You do not have a dealer profile.",
      });
    }

    const authorizedCategoryIds = await resolveAuthorizedCategoryIds(
      ctx.db,
      dealer.id,
    );

    const leadCount =
      authorizedCategoryIds.length === 0
        ? 0
        : await ctx.db.booking.count({
            where: {
              categoryId: { in: authorizedCategoryIds },
              OR: [{ dealerId: null }, { dealerId: dealer.id }],
            },
          });

    let trustScore: Awaited<
      ReturnType<typeof calculateTrustScore>
    > | null = null;
    try {
      trustScore = await loadDealerTrustScore(ctx, dealer.id);
    } catch {
      trustScore = null;
    }

    return {
      dealer: {
        id: dealer.id,
        slug: dealer.slug,
        agencyName: dealer.agencyName,
        dnfbpCertNumber: dealer.dnfbpCertNumber,
        dnfbpVerified: dealer.dnfbpVerified,
        completedDeals: dealer.completedDeals,
      },
      authorizedSocieties: dealer.authorizations.map((auth) => auth.society),
      metrics: {
        leadCount,
        authorizedSocietyCount: dealer.authorizations.length,
        completedDeals: dealer.completedDeals,
      },
      trustScore,
    };
  }),

  /**
   * Buyer enquiries (bookings) in societies the dealer is authorized for.
   * Excludes bookings assigned to other dealers.
   */
  listLeads: dealerProcedure.query(async ({ ctx }) => {
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

    const authorizedCategoryIds = await resolveAuthorizedCategoryIds(
      ctx.db,
      dealer.id,
    );

    if (authorizedCategoryIds.length === 0) {
      return [];
    }

    const categories = await ctx.db.inventoryCategory.findMany({
      where: { id: { in: authorizedCategoryIds } },
      select: {
        id: true,
        phase: true,
        block: true,
        sizeLabel: true,
        society: { select: { id: true, name: true, slug: true, citySlug: true } },
      },
    });
    const categoryById = new Map(categories.map((c) => [c.id, c]));

    const bookings = await ctx.db.booking.findMany({
      where: {
        categoryId: { in: authorizedCategoryIds },
        OR: [{ dealerId: null }, { dealerId: dealer.id }],
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            nadraVerified: true,
            atlStatus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return bookings.map((booking) => {
      const category = categoryById.get(booking.categoryId);
      return {
        booking: {
          id: booking.id,
          status: booking.status,
          createdAt: booking.createdAt,
          dealerId: booking.dealerId,
        },
        buyer: booking.buyer,
        society: category?.society ?? null,
        categoryLabel: category
          ? `${category.phase} · ${category.block} · ${category.sizeLabel}`
          : null,
      };
    });
  }),

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

  /**
   * Lists dealer partner authorizations for a society, including dealer profile
   * details and optional category scope. Restricted to the owning administrator.
   */
  listPartners: societyAdminProcedure
    .input(z.object({ societyId: idSchema.optional() }))
    .query(async ({ ctx, input }) => {
      const societyId = resolveOwnedSocietyId(ctx.session, input.societyId);

      const authorizations = await ctx.db.societyPartnerAuthorization.findMany({
        where: { societyId },
        include: {
          dealer: {
            select: {
              id: true,
              slug: true,
              agencyName: true,
              dnfbpVerified: true,
              completedDeals: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { dealer: { agencyName: "asc" } }],
      });

      const categories = await ctx.db.inventoryCategory.findMany({
        where: { societyId },
        select: { id: true, phase: true, block: true, sizeLabel: true },
      });
      const categoryById = new Map(categories.map((c) => [c.id, c]));

      return authorizations.map((auth) => {
        const category =
          auth.categoryId !== null
            ? categoryById.get(auth.categoryId)
            : undefined;
        return {
          id: auth.id,
          status: auth.status,
          commissionSplitPct: auth.commissionSplitPct.toString(),
          categoryId: auth.categoryId,
          categoryLabel: category
            ? `${category.phase} · ${category.block} · ${category.sizeLabel}`
            : null,
          dealer: auth.dealer,
        };
      });
    }),
});

/** Loads persisted dealer signals and delegates scoring to the domain package. */
async function loadDealerTrustScore(
  ctx: Pick<TRPCContext, "db">,
  dealerId: string,
) {
  const dealer = await ctx.db.dealerProfile.findUnique({
    where: { id: dealerId },
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
}

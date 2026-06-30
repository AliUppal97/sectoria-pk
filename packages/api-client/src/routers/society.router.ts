import { z } from "zod";
import {
  EscrowState,
  idSchema,
  latitudeSchema,
  longitudeSchema,
  slugSchema,
  VerificationTier,
  verificationTierSchema,
} from "@sectoria/types";
import { calculateTrustScore } from "@sectoria/domain-trust-score";
import { router, TRPCError } from "../trpc.js";
import { publicProcedure, societyAdminProcedure } from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";
import { resolveOwnedSocietyId } from "../middleware/resolve-owned-society-id.js";
import { mapDomainError } from "../lib/map-domain-error.js";

/**
 * Society procedures. Reads are public (the marketplace must be crawlable); the
 * single mutation is gated on the caller being the administrator of *that*
 * society — a role check alone is not enough (see `auth-and-access-control.mdc`).
 */
export const societyRouter = router({
  /** Public directory listing with optional city / tier / authority filters. */
  list: publicProcedure
    .input(
      z
        .object({
          citySlug: slugSchema.optional(),
          verificationTier: verificationTierSchema.optional(),
          authority: z.string().min(1).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.society.findMany({
        where: {
          ...(input?.citySlug !== undefined
            ? { citySlug: input.citySlug }
            : {}),
          ...(input?.verificationTier !== undefined
            ? { verificationTier: input.verificationTier }
            : {}),
          ...(input?.authority !== undefined
            ? { authority: input.authority }
            : {}),
        },
        orderBy: { name: "asc" },
      });
    }),

  /** Public society profile by slug, including its inventory categories. */
  getBySlug: publicProcedure
    .input(z.object({ slug: slugSchema }))
    .query(async ({ ctx, input }) => {
      const society = await ctx.db.society.findUnique({
        where: { slug: input.slug },
        include: { categories: true },
      });
      if (society === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Society not found.",
        });
      }
      return society;
    }),

  /** Updates editable profile fields. Restricted to the owning administrator. */
  update: societyAdminProcedure
    .input(
      z.object({
        societyId: idSchema,
        data: z.object({
          description: z.string().min(1).optional(),
          amenities: z.array(z.string().min(1)).optional(),
          developmentStage: z.string().min(1).optional(),
          developmentPct: z.number().int().min(0).max(100).optional(),
          heroImageUrl: z.string().url().nullable().optional(),
          latitude: latitudeSchema.nullable().optional(),
          longitude: longitudeSchema.nullable().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const society = await ctx.db.society.findUnique({
        where: { id: input.societyId },
        select: { id: true },
      });
      if (society === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Society not found.",
        });
      }
      assertSocietyOwnership(ctx.session, society.id);

      return ctx.db.society.update({
        where: { id: society.id },
        data: input.data,
      });
    }),

  /**
   * Society-portal dashboard metrics: compliance score (via the trust-score
   * domain), HSMS status, inventory summary, and active booking counts.
   * The caller may only read their own society unless they are platform staff.
   */
  getPortalOverview: societyAdminProcedure
    .input(z.object({ societyId: idSchema.optional() }).optional())
    .query(async ({ ctx, input }) => {
      try {
        const societyId = resolveOwnedSocietyId(
          ctx.session,
          input?.societyId,
        );

        const society = await ctx.db.society.findUnique({
          where: { id: societyId },
        });
        if (society === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Society not found.",
          });
        }

        const categoryIds = (
          await ctx.db.inventoryCategory.findMany({
            where: { societyId },
            select: { id: true },
          })
        ).map((row) => row.id);

        const [completedBookings, activeBookings, pendingQueue, ratings] =
          await Promise.all([
            ctx.db.booking.count({
              where: {
                categoryId: { in: categoryIds },
                status: {
                  in: [
                    EscrowState.DOCUMENTS_ISSUED,
                    EscrowState.COMMISSION_RELEASED,
                  ],
                },
              },
            }),
            ctx.db.booking.count({
              where: {
                categoryId: { in: categoryIds },
                status: {
                  notIn: [
                    EscrowState.CANCELLED,
                    EscrowState.COMMISSION_RELEASED,
                  ],
                },
              },
            }),
            ctx.db.booking.count({
              where: {
                categoryId: { in: categoryIds },
                status: {
                  in: [
                    EscrowState.BOOKING_TOKEN_PAID,
                    EscrowState.INSTALLMENT_DUE,
                    EscrowState.FULLY_PAID,
                  ],
                },
              },
            }),
            ctx.db.review.aggregate({
              where: { subjectSocietyId: societyId },
              _avg: { rating: true },
            }),
          ]);

        const verificationCompleteness = societyComplianceFactor(society);
        const trustScore = calculateTrustScore({
          verifiedTransactionCount: completedBookings,
          averageBuyerRating: ratings._avg.rating ?? null,
          responseTimePercentile: 50,
          verificationCompleteness,
          disputes: { resolved: 0, unresolved: 0 },
        });

        const categoryCount = categoryIds.length;
        const availableUnits = await ctx.db.inventoryCategory.aggregate({
          where: { societyId },
          _sum: { availableUnits: true },
        });

        return {
          society: {
            id: society.id,
            name: society.name,
            slug: society.slug,
            city: society.city,
            citySlug: society.citySlug,
            authority: society.authority,
            verificationTier: society.verificationTier,
            lopReferenceNo: society.lopReferenceNo,
            nocReferenceNo: society.nocReferenceNo,
            hsmsLinked: society.hsmsLinked,
            developmentStage: society.developmentStage,
            developmentPct: society.developmentPct,
          },
          complianceScore: trustScore.score,
          complianceBreakdown: trustScore.breakdown,
          metrics: {
            activeBookings,
            pendingQueue,
            categoryCount,
            availableUnits: availableUnits._sum.availableUnits ?? 0,
          },
        };
      } catch (error) {
        throw mapDomainError(error);
      }
    }),

  /**
   * Updates LOP/NOC references and HSMS link status. Restricted to the owning
   * administrator; tier is derived from the submitted compliance fields.
   */
  updateCompliance: societyAdminProcedure
    .input(
      z.object({
        societyId: idSchema.optional(),
        lopReferenceNo: z.string().min(1).nullable().optional(),
        nocReferenceNo: z.string().min(1).nullable().optional(),
        hsmsLinked: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const societyId = resolveOwnedSocietyId(ctx.session, input.societyId);

      const existing = await ctx.db.society.findUnique({
        where: { id: societyId },
      });
      if (existing === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Society not found.",
        });
      }
      assertSocietyOwnership(ctx.session, societyId);

      const lopReferenceNo =
        input.lopReferenceNo !== undefined
          ? input.lopReferenceNo
          : existing.lopReferenceNo;
      const nocReferenceNo =
        input.nocReferenceNo !== undefined
          ? input.nocReferenceNo
          : existing.nocReferenceNo;
      const hsmsLinked =
        input.hsmsLinked !== undefined ? input.hsmsLinked : existing.hsmsLinked;

      const verificationTier = deriveVerificationTier({
        lopReferenceNo,
        nocReferenceNo,
        hsmsLinked,
      });

      return ctx.db.society.update({
        where: { id: societyId },
        data: {
          lopReferenceNo,
          nocReferenceNo,
          hsmsLinked,
          verificationTier,
        },
      });
    }),
});

/** Maps LOP/NOC/HSMS presence to a 0–1 verification-completeness factor. */
function societyComplianceFactor(society: {
  lopReferenceNo: string | null;
  nocReferenceNo: string | null;
  hsmsLinked: boolean;
}): number {
  let score = 0;
  if (society.lopReferenceNo !== null) score += 1 / 3;
  if (society.nocReferenceNo !== null) score += 1 / 3;
  if (society.hsmsLinked) score += 1 / 3;
  return score;
}

function deriveVerificationTier(fields: {
  lopReferenceNo: string | null;
  nocReferenceNo: string | null;
  hsmsLinked: boolean;
}): VerificationTier {
  if (fields.hsmsLinked && fields.lopReferenceNo && fields.nocReferenceNo) {
    return VerificationTier.HSMS_LINKED;
  }
  if (fields.lopReferenceNo && fields.nocReferenceNo) {
    return VerificationTier.VERIFIED;
  }
  return VerificationTier.PENDING;
}

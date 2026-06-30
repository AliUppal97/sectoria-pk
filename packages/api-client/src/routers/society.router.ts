import { z } from "zod";
import {
  EscrowState,
  decimalStringSchema,
  geoJsonBoundarySchema,
  idSchema,
  isoDateTimeSchema,
  latitudeSchema,
  longitudeSchema,
  slugSchema,
  societyBookingStatusSchema,
  VerificationTier,
  verificationTierSchema,
} from "@sectoria/types";
import { calculateTrustScore } from "@sectoria/domain-trust-score";
import { Prisma } from "@sectoria/database";
import { router, TRPCError } from "../trpc.js";
import { publicProcedure, societyAdminProcedure } from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";
import { resolveOwnedSocietyId } from "../middleware/resolve-owned-society-id.js";
import { mapDomainError } from "../lib/map-domain-error.js";

function toSocietyDto<T extends Record<string, unknown>>(society: T) {
  const createdAt =
    society.createdAt instanceof Date
      ? society.createdAt.toISOString()
      : typeof society.createdAt === "string"
        ? society.createdAt
        : new Date().toISOString();
  const toIso = (value: unknown) => {
    if (value === null || value === undefined) return null;
    return value instanceof Date ? value.toISOString() : String(value);
  };
  const totalLandKanal =
    society.totalLandKanal !== null &&
    society.totalLandKanal !== undefined &&
    typeof society.totalLandKanal === "object" &&
    "toString" in society.totalLandKanal
      ? String(society.totalLandKanal)
      : (society.totalLandKanal as string | null | undefined) ?? null;
  const developedLandKanal =
    society.developedLandKanal !== null &&
    society.developedLandKanal !== undefined &&
    typeof society.developedLandKanal === "object" &&
    "toString" in society.developedLandKanal
      ? String(society.developedLandKanal)
      : (society.developedLandKanal as string | null | undefined) ?? null;
  return {
    ...society,
    totalLandKanal,
    developedLandKanal,
    bookingOpensAt: toIso(society.bookingOpensAt),
    bookingClosesAt: toIso(society.bookingClosesAt),
    createdAt,
  };
}

function toPaymentPlanDto<T extends { downPaymentPct: { toString(): string } }>(
  plan: T,
) {
  return {
    ...plan,
    downPaymentPct: plan.downPaymentPct.toString(),
  };
}

function toCategoryWithPlansDto<
  T extends { pricePerSqft: { toString(): string }; paymentPlans: Array<{ downPaymentPct: { toString(): string } }> },
>(category: T) {
  return {
    ...category,
    pricePerSqft: category.pricePerSqft.toString(),
    paymentPlans: category.paymentPlans.map(toPaymentPlanDto),
  };
}

function toSocietyUpdateDto<T extends Record<string, unknown>>(update: T) {
  const publishedAt =
    update.publishedAt instanceof Date
      ? update.publishedAt.toISOString()
      : String(update.publishedAt);
  const createdAt =
    update.createdAt instanceof Date
      ? update.createdAt.toISOString()
      : String(update.createdAt);
  return {
    ...update,
    publishedAt,
    createdAt,
  };
}

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
      const societies = await ctx.db.society.findMany({
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
      return societies.map(toSocietyDto);
    }),

  /** Public society profile by slug, including categories, payment plans, and updates. */
  getBySlug: publicProcedure
    .input(z.object({ slug: slugSchema }))
    .query(async ({ ctx, input }) => {
      const society = await ctx.db.society.findUnique({
        where: { slug: input.slug },
        include: {
          categories: {
            orderBy: [{ phase: "asc" }, { sizeSqft: "asc" }],
            include: { paymentPlans: true },
          },
          updates: {
            where: { isPublished: true },
            orderBy: { publishedAt: "desc" },
            take: 10,
          },
        },
      });
      if (society === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Society not found.",
        });
      }
      const { categories, updates, ...rest } = society;
      return {
        ...toSocietyDto(rest),
        categories: categories.map(toCategoryWithPlansDto),
        updates: updates.map(toSocietyUpdateDto),
      };
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
          addressLine: z.string().min(1).nullable().optional(),
          district: z.string().min(1).nullable().optional(),
          totalLandKanal: decimalStringSchema.nullable().optional(),
          developedLandKanal: decimalStringSchema.nullable().optional(),
          boundaryGeoJson: geoJsonBoundarySchema.nullable().optional(),
          bookingStatus: societyBookingStatusSchema.optional(),
          bookingOpensAt: isoDateTimeSchema.nullable().optional(),
          bookingClosesAt: isoDateTimeSchema.nullable().optional(),
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

      const { boundaryGeoJson, bookingOpensAt, bookingClosesAt, ...restData } =
        input.data;

      return toSocietyDto(
        await ctx.db.society.update({
          where: { id: society.id },
          data: {
            ...restData,
            ...(boundaryGeoJson !== undefined
              ? {
                  boundaryGeoJson:
                    boundaryGeoJson === null
                      ? Prisma.JsonNull
                      : (boundaryGeoJson as Prisma.InputJsonValue),
                }
              : {}),
            bookingOpensAt:
              bookingOpensAt !== undefined
                ? bookingOpensAt === null
                  ? null
                  : new Date(bookingOpensAt)
                : undefined,
            bookingClosesAt:
              bookingClosesAt !== undefined
                ? bookingClosesAt === null
                  ? null
                  : new Date(bookingClosesAt)
                : undefined,
          },
        }),
      );
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

import { z } from "zod";
import {
  EscrowState,
  LedgerEventType,
  SocietyPublishStatus,
  cityLabelForSlug,
  decimalStringSchema,
  geoJsonBoundarySchema,
  idSchema,
  isoDateTimeSchema,
  latitudeSchema,
  longitudeSchema,
  slugSchema,
  societyAssignAdminInputSchema,
  societyBookingStatusSchema,
  societyCreateInputSchema,
  societyImportBatchInputSchema,
  societyListFeaturedInputSchema,
  societyListSummariesInputSchema,
  societySetPublishStatusInputSchema,
  UserRole,
  VerificationTier,
  verificationTierSchema,
  type SocietyBookingStatus,
  type SocietyImportRowResult,
} from "@sectoria/types";
import { calculateTrustScore } from "@sectoria/domain-trust-score";
import { createLedgerEvent } from "@sectoria/domain-ledger";
import { Prisma, PrismaClient } from "@sectoria/database";
import type { StorageAdapter } from "@sectoria/storage";
import { router, TRPCError } from "../trpc.js";
import {
  opsProcedure,
  publicProcedure,
  societyAdminProcedure,
  superAdminProcedure,
} from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";
import { resolveOwnedSocietyId } from "../middleware/resolve-owned-society-id.js";
import { mapDomainError } from "../lib/map-domain-error.js";
import { persistLedgerEvent } from "../lib/persist-ledger-event.js";
import { toId } from "../lib/ids.js";
import {
  calculateSocietyCompleteness,
  type SocietyCompleteness,
} from "../lib/society-completeness.js";
import { pickSocietyCardHeroUrl } from "../lib/society-hero-url.js";

/** Fields needed to map a society row into a directory/homepage summary card. */
type SocietySummarySource = {
  id: string;
  slug: string;
  name: string;
  city: string;
  citySlug: string;
  authority: string;
  verificationTier: VerificationTier;
  hsmsLinked: boolean;
  developmentStage: string;
  developmentPct: number;
  startingPricePkr: number | null;
  latitude: number | null;
  longitude: number | null;
  totalLandKanal: { toString(): string } | string | null;
  developedLandKanal: { toString(): string } | string | null;
  bookingStatus: SocietyBookingStatus;
  heroImageUrl: string | null;
};

/**
 * Bounded aggregates + DTO mapping for a page of societies (listSummaries /
 * listFeatured). Category counts and review averages are resolved in a fixed
 * number of queries — no per-society fan-out.
 */
async function enrichSocietySummaryPage(
  ctx: {
    db: Pick<PrismaClient, "inventoryCategory" | "review" | "societyMedia">;
    storage: StorageAdapter;
  },
  page: readonly SocietySummarySource[],
) {
  const societyIds = page.map((society) => society.id);

  const [categoryRows, reviewGroups, heroMediaRows] =
    societyIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          ctx.db.inventoryCategory.findMany({
            where: { societyId: { in: societyIds } },
            select: { societyId: true },
          }),
          ctx.db.review.groupBy({
            by: ["subjectSocietyId"],
            where: { subjectSocietyId: { in: societyIds } },
            _avg: { rating: true },
            _count: { _all: true },
          }),
          ctx.db.societyMedia.findMany({
            where: { societyId: { in: societyIds }, kind: "HERO" },
            orderBy: [{ sortOrder: "asc" }],
            select: { societyId: true, storageKey: true },
          }),
        ]);

  const heroStorageKeyBySociety = new Map<string, string>();
  for (const row of heroMediaRows) {
    if (!heroStorageKeyBySociety.has(row.societyId)) {
      heroStorageKeyBySociety.set(row.societyId, row.storageKey);
    }
  }

  const categoryCountBySociety = new Map<string, number>();
  for (const category of categoryRows) {
    categoryCountBySociety.set(
      category.societyId,
      (categoryCountBySociety.get(category.societyId) ?? 0) + 1,
    );
  }

  const ratingBySociety = new Map<string, { value: number; count: number }>();
  for (const group of reviewGroups) {
    if (group.subjectSocietyId === null) continue;
    const count = group._count._all;
    const value = group._avg.rating;
    if (count > 0 && value !== null) {
      ratingBySociety.set(group.subjectSocietyId, { value, count });
    }
  }

  return page.map((society) => ({
    id: society.id,
    slug: society.slug,
    name: society.name,
    city: society.city,
    citySlug: society.citySlug,
    authority: society.authority,
    verificationTier: society.verificationTier,
    hsmsLinked: society.hsmsLinked,
    developmentStage: society.developmentStage,
    developmentPct: society.developmentPct,
    categoryCount: categoryCountBySociety.get(society.id) ?? 0,
    startingPrice: society.startingPricePkr ?? null,
    rating: ratingBySociety.get(society.id) ?? null,
    latitude: society.latitude,
    longitude: society.longitude,
    totalLandKanal:
      society.totalLandKanal !== null
        ? society.totalLandKanal.toString()
        : null,
    developedLandKanal:
      society.developedLandKanal !== null
        ? society.developedLandKanal.toString()
        : null,
    bookingStatus: society.bookingStatus,
    latestUpdateTitle: null as string | null,
    heroImageUrl: pickSocietyCardHeroUrl(
      society.heroImageUrl,
      heroStorageKeyBySociety.get(society.id),
      ctx.storage,
    ),
  }));
}

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
    publishedAt: toIso(society.publishedAt),
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

/** A row in the ops onboarding console list (M0.3). */
export interface AdminSocietyListItem {
  id: string;
  name: string;
  slug: string;
  city: string;
  citySlug: string;
  authority: string;
  verificationTier: VerificationTier;
  publishStatus: SocietyPublishStatus;
  developmentPct: number;
  hasAdmin: boolean;
  completeness: SocietyCompleteness;
  createdAt: string;
}

/**
 * The ops-facing detail returned by `create`/`setPublishStatus`/`getForAdmin`.
 * Declared explicitly (rather than inferred from `toSocietyDto`) so the tRPC
 * React hooks that call these procedures don't instantiate an excessively deep
 * type over the large `society` sub-router (TS2589).
 */
export interface SocietyAdminDetail {
  id: string;
  slug: string;
  name: string;
  city: string;
  citySlug: string;
  authority: string;
  verificationTier: VerificationTier;
  publishStatus: SocietyPublishStatus;
  publishedAt: string | null;
  createdById: string | null;
  developmentPct: number;
  developmentStage: string;
  createdAt: string;
  completeness: SocietyCompleteness;
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
          // Public read — only PUBLISHED societies are ever visible (M0.1).
          publishStatus: SocietyPublishStatus.PUBLISHED,
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
          developer: {
            select: {
              slug: true,
              name: true,
              description: true,
              logoKey: true,
              foundedYear: true,
              websiteUrl: true,
            },
          },
        },
      });
      // Public read: a DRAFT/ARCHIVED society is indistinguishable from a
      // non-existent one to the marketplace (M0.1). Staff/owning admin read
      // drafts through the ops/portal procedures instead.
      if (
        society === null ||
        society.publishStatus !== SocietyPublishStatus.PUBLISHED
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Society not found.",
        });
      }
      const { categories, updates, developer, ...rest } = society;
      return {
        ...toSocietyDto(rest),
        developer,
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
          virtualTourUrl: z.string().url().nullable().optional(),
          promoVideoUrl: z.string().url().nullable().optional(),
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

  /** Society admin: editable profile fields (works for DRAFT societies). */
  getEditableProfile: societyAdminProcedure
    .input(z.object({ societyId: idSchema }))
    .query(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const society = await ctx.db.society.findUnique({
        where: { id: input.societyId },
        select: {
          description: true,
          amenities: true,
          developmentStage: true,
          developmentPct: true,
          virtualTourUrl: true,
          promoVideoUrl: true,
        },
      });
      if (society === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Society not found.",
        });
      }
      return society;
    }),

  /** Society admin: location, booking, and compliance fields (any publish status). */
  getPortalSettings: societyAdminProcedure
    .input(z.object({ societyId: idSchema }))
    .query(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const society = await ctx.db.society.findUnique({
        where: { id: input.societyId },
        select: {
          slug: true,
          lopReferenceNo: true,
          nocReferenceNo: true,
          hsmsLinked: true,
          verificationTier: true,
          addressLine: true,
          district: true,
          latitude: true,
          longitude: true,
          totalLandKanal: true,
          developedLandKanal: true,
          boundaryGeoJson: true,
          bookingStatus: true,
          bookingOpensAt: true,
          bookingClosesAt: true,
        },
      });
      if (society === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Society not found.",
        });
      }
      const toIso = (value: Date | null) =>
        value === null ? null : value.toISOString();
      return {
        ...society,
        totalLandKanal:
          society.totalLandKanal !== null
            ? society.totalLandKanal.toString()
            : null,
        developedLandKanal:
          society.developedLandKanal !== null
            ? society.developedLandKanal.toString()
            : null,
        bookingOpensAt: toIso(society.bookingOpensAt),
        bookingClosesAt: toIso(society.bookingClosesAt),
      };
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

  /**
   * Cursor-paginated directory listing (M0.7 + H1). Replaces the old N+1
   * fan-out: category counts and review averages are resolved in a *bounded*
   * number of queries. Price filter/sort uses denormalized `startingPricePkr`
   * (ADR-010). Public — only PUBLISHED societies appear.
   */
  listSummaries: publicProcedure
    .input(societyListSummariesInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 24;
      const sort = input?.sort ?? "name";
      const hasPriceBound =
        input?.priceMinPkr !== undefined || input?.priceMaxPkr !== undefined;
      const hasCategoryFilter =
        input?.plotType !== undefined || input?.sizeLabel !== undefined;

      const where: Prisma.SocietyWhereInput = {
        publishStatus: SocietyPublishStatus.PUBLISHED,
        ...(input?.citySlug !== undefined ? { citySlug: input.citySlug } : {}),
        ...(input?.authority !== undefined
          ? { authority: input.authority }
          : {}),
        ...(input?.verificationTier !== undefined
          ? { verificationTier: input.verificationTier }
          : {}),
        ...(input?.developmentStage !== undefined
          ? { developmentStage: input.developmentStage }
          : {}),
        ...(input?.bookingStatus !== undefined
          ? { bookingStatus: input.bookingStatus }
          : {}),
        ...(hasPriceBound
          ? {
              startingPricePkr: {
                ...(input?.priceMinPkr !== undefined
                  ? { gte: input.priceMinPkr }
                  : {}),
                ...(input?.priceMaxPkr !== undefined
                  ? { lte: input.priceMaxPkr }
                  : {}),
              },
            }
          : {}),
        // Plot type ∩ size: AND inside one categories.some (foundations §3.3).
        ...(hasCategoryFilter
          ? {
              categories: {
                some: {
                  ...(input?.plotType !== undefined
                    ? { plotType: input.plotType }
                    : {}),
                  ...(input?.sizeLabel !== undefined
                    ? { sizeLabel: input.sizeLabel }
                    : {}),
                },
              },
            }
          : {}),
        // Name search is trigram-backed (pg_trgm GIN on Society.name). City
        // match is case-insensitive contains without a city trigram — V2 keeps
        // the smallest correct diff (foundations §3.4).
        ...(input?.search !== undefined
          ? {
              OR: [
                { name: { contains: input.search, mode: "insensitive" } },
                { city: { contains: input.search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const orderBy: Prisma.SocietyOrderByWithRelationInput[] =
        sort === "priceAsc"
          ? [
              { startingPricePkr: { sort: "asc", nulls: "last" } },
              { id: "asc" },
            ]
          : sort === "priceDesc"
            ? [
                { startingPricePkr: { sort: "desc", nulls: "last" } },
                { id: "asc" },
              ]
            : [{ name: "asc" }, { id: "asc" }];

      // Query 1: one page of societies (+1 to detect a next page).
      const rows = await ctx.db.society.findMany({
        where,
        orderBy,
        take: limit + 1,
        ...(input?.cursor != null
          ? { cursor: { id: input.cursor }, skip: 1 }
          : {}),
      });

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;
      const items = await enrichSocietySummaryPage(ctx, page);

      return { items, nextCursor };
    }),

  /**
   * Homepage featured societies (H3 / homepage-ia §2.2). Trust-first ranking:
   * HSMS_LINKED → VERIFIED → startingPricePkr asc (nulls last) → name.
   * Relies on Postgres VerificationTier enum order (PENDING < VERIFIED <
   * HSMS_LINKED) via `verificationTier: desc`. Not priceAsc-only.
   */
  listFeatured: publicProcedure
    .input(societyListFeaturedInputSchema.optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 6;

      const page = await ctx.db.society.findMany({
        where: { publishStatus: SocietyPublishStatus.PUBLISHED },
        orderBy: [
          { verificationTier: "desc" },
          { startingPricePkr: { sort: "asc", nulls: "last" } },
          { name: "asc" },
          { id: "asc" },
        ],
        take: limit,
      });

      const items = await enrichSocietySummaryPage(ctx, page);
      return { items };
    }),

  /**
   * Directory facet counts (M0.7 + H1). Bounded groupBy/aggregates over
   * PUBLISHED societies (and their categories). V2 counts are *global*
   * PUBLISHED tallies — not scoped to the active filter set (V2.1 if needed).
   */
  facets: publicProcedure.query(async ({ ctx }) => {
    const publishedWhere = {
      publishStatus: SocietyPublishStatus.PUBLISHED,
    } as const;

    const [
      societyGroups,
      stageGroups,
      bookingGroups,
      plotTypeGroups,
      sizeLabelGroups,
    ] = await Promise.all([
      ctx.db.society.groupBy({
        by: ["citySlug", "city", "authority", "verificationTier"],
        where: publishedWhere,
        _count: { _all: true },
      }),
      ctx.db.society.groupBy({
        by: ["developmentStage"],
        where: publishedWhere,
        _count: { _all: true },
      }),
      ctx.db.society.groupBy({
        by: ["bookingStatus"],
        where: publishedWhere,
        _count: { _all: true },
      }),
      ctx.db.inventoryCategory.groupBy({
        by: ["plotType"],
        where: { society: publishedWhere },
        _count: { _all: true },
      }),
      ctx.db.inventoryCategory.groupBy({
        by: ["sizeLabel"],
        where: { society: publishedWhere },
        _count: { _all: true },
      }),
    ]);

    const cityCounts = new Map<string, { label: string; count: number }>();
    const authorityCounts = new Map<string, number>();
    const tierCounts = new Map<string, number>();

    for (const group of societyGroups) {
      const count = group._count._all;
      const city = cityCounts.get(group.citySlug);
      cityCounts.set(group.citySlug, {
        label: group.city,
        count: (city?.count ?? 0) + count,
      });
      authorityCounts.set(
        group.authority,
        (authorityCounts.get(group.authority) ?? 0) + count,
      );
      tierCounts.set(
        group.verificationTier,
        (tierCounts.get(group.verificationTier) ?? 0) + count,
      );
    }

    const SIZE_LABEL_FACET_CAP = 24;

    return {
      cities: [...cityCounts.entries()]
        .map(([slug, { label, count }]) => ({ slug, label, count }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      authorities: [...authorityCounts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value)),
      tiers: [...tierCounts.entries()].map(([tier, count]) => ({
        tier: tier as VerificationTier,
        count,
      })),
      plotTypes: plotTypeGroups
        .map((group) => ({
          value: group.plotType,
          count: group._count._all,
        }))
        .sort((a, b) => a.value.localeCompare(b.value)),
      sizeLabels: sizeLabelGroups
        .map((group) => ({
          value: group.sizeLabel,
          count: group._count._all,
        }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
        .slice(0, SIZE_LABEL_FACET_CAP),
      developmentStages: stageGroups
        .map((group) => ({
          value: group.developmentStage,
          count: group._count._all,
        }))
        .sort((a, b) => a.value.localeCompare(b.value)),
      bookingStatuses: bookingGroups
        .map((group) => ({
          value: group.bookingStatus,
          count: group._count._all,
        }))
        .sort((a, b) => a.value.localeCompare(b.value)),
    };
  }),

  /**
   * Ops onboarding list (M0.3): every society regardless of publish status, with
   * a completeness score, for the admin console. Cursor-paginated and filterable;
   * completeness is computed with the pure helper (the same one the publish gate
   * uses), so the console and gate can never disagree.
   */
  listForAdmin: opsProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(60).default(25),
        cursor: idSchema.nullish(),
        search: z.string().trim().min(1).max(120).optional(),
        citySlug: slugSchema.optional(),
        authority: z.string().min(1).optional(),
        verificationTier: verificationTierSchema.optional(),
        publishStatus: z
          .enum([
            SocietyPublishStatus.DRAFT,
            SocietyPublishStatus.PUBLISHED,
            SocietyPublishStatus.ARCHIVED,
          ])
          .optional(),
      }),
    )
    .query(async ({
      ctx,
      input,
    }): Promise<{
      items: AdminSocietyListItem[];
      nextCursor: string | null;
    }> => {
      const where: Prisma.SocietyWhereInput = {
        ...(input.publishStatus !== undefined
          ? { publishStatus: input.publishStatus }
          : {}),
        ...(input.citySlug !== undefined ? { citySlug: input.citySlug } : {}),
        ...(input.authority !== undefined
          ? { authority: input.authority }
          : {}),
        ...(input.verificationTier !== undefined
          ? { verificationTier: input.verificationTier }
          : {}),
        ...(input.search !== undefined
          ? {
              OR: [
                { name: { contains: input.search, mode: "insensitive" } },
                { city: { contains: input.search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const rows = await ctx.db.society.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: input.limit + 1,
        include: { _count: { select: { users: true } } },
        ...(input.cursor != null
          ? { cursor: { id: input.cursor }, skip: 1 }
          : {}),
      });

      const hasMore = rows.length > input.limit;
      const page = hasMore ? rows.slice(0, input.limit) : rows;
      const nextCursor = hasMore ? (page.at(-1)?.id ?? null) : null;

      const items = page.map((society) => {
        const completeness = calculateSocietyCompleteness(society);
        return {
          id: society.id,
          name: society.name,
          slug: society.slug,
          city: society.city,
          citySlug: society.citySlug,
          authority: society.authority,
          verificationTier: society.verificationTier,
          publishStatus: society.publishStatus,
          developmentPct: society.developmentPct,
          hasAdmin: society._count.users > 0,
          completeness,
          createdAt: society.createdAt.toISOString(),
        };
      });

      return { items, nextCursor };
    }),

  /**
   * Reads a single society for the ops console, including its completeness — the
   * one place staff can inspect a DRAFT/ARCHIVED society (not a public read).
   */
  getForAdmin: opsProcedure
    .input(z.object({ societyId: idSchema }))
    .query(async ({ ctx, input }): Promise<SocietyAdminDetail> => {
      const society = await ctx.db.society.findUnique({
        where: { id: input.societyId },
      });
      if (society === null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Society not found." });
      }
      return {
        ...toSocietyDto(society),
        completeness: calculateSocietyCompleteness(society),
      };
    }),

  /**
   * Creates a society as a `DRAFT` (M0.2). Ops-only — onboarding is platform
   * work, never self-service. Slug collisions throw `CONFLICT`. `city` is derived
   * from the curated `citySlug` reference so it can never drift. Emits a
   * `SOCIETY_CREATED` ledger event in the same transaction as the insert.
   */
  create: opsProcedure
    .input(societyCreateInputSchema)
    .mutation(async ({ ctx, input }): Promise<SocietyAdminDetail> => {
      try {
        const existing = await ctx.db.society.findUnique({
          where: { slug: input.slug },
          select: { id: true },
        });
        if (existing !== null) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A society with the slug "${input.slug}" already exists.`,
          });
        }

        const city = cityLabelForSlug(input.citySlug);
        if (city === undefined) {
          // Reference validation already runs in the schema; this is a guard.
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unknown city slug.",
          });
        }

        const event = createLedgerEvent({
          id: toId(ctx.generateId()),
          type: LedgerEventType.SOCIETY_CREATED,
          entityId: toId("pending"),
          payload: {
            slug: input.slug,
            name: input.name,
            citySlug: input.citySlug,
            authority: input.authority,
          },
          actor: {
            actorId: ctx.session.user.id,
            actorRole: ctx.session.user.role,
          },
          createdAt: ctx.now().toISOString(),
        });

        return await ctx.db.$transaction(async (tx) => {
          const society = await tx.society.create({
            data: {
              slug: input.slug,
              name: input.name,
              city,
              citySlug: input.citySlug,
              authority: input.authority,
              description: "",
              developmentStage: "Planning",
              publishStatus: SocietyPublishStatus.DRAFT,
              createdById: ctx.session.user.id,
            },
          });
          await persistLedgerEvent(tx, { ...event, entityId: toId(society.id) });
          return {
            ...toSocietyDto(society),
            completeness: calculateSocietyCompleteness(society),
          };
        });
      } catch (error) {
        throw mapDomainError(error);
      }
    }),

  /**
   * Moves a society between lifecycle states (M0.2). Publishing is gated on the
   * completeness check — a society cannot go `PUBLISHED` with any required field
   * missing. Emits `SOCIETY_PUBLISHED` (→PUBLISHED) or `SOCIETY_ARCHIVED`
   * (→ARCHIVED or unpublish→DRAFT; the exact target is in the payload) via the
   * standard ledger builder, in the same transaction as the status change.
   */
  setPublishStatus: opsProcedure
    .input(societySetPublishStatusInputSchema)
    .mutation(async ({ ctx, input }): Promise<SocietyAdminDetail> => {
      try {
        const society = await ctx.db.society.findUnique({
          where: { id: input.societyId },
        });
        if (society === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Society not found.",
          });
        }

        if (input.status === society.publishStatus) {
          return {
            ...toSocietyDto(society),
            completeness: calculateSocietyCompleteness(society),
          };
        }

        if (input.status === SocietyPublishStatus.PUBLISHED) {
          const completeness = calculateSocietyCompleteness(society);
          if (!completeness.isPublishable) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `This society isn't ready to publish. Missing: ${completeness.missing.join(", ")}.`,
            });
          }
        }

        const isPublishing = input.status === SocietyPublishStatus.PUBLISHED;
        const eventType = isPublishing
          ? LedgerEventType.SOCIETY_PUBLISHED
          : LedgerEventType.SOCIETY_ARCHIVED;

        const event = createLedgerEvent({
          id: toId(ctx.generateId()),
          type: eventType,
          entityId: toId(society.id),
          payload: {
            previousStatus: society.publishStatus,
            newStatus: input.status,
            societyName: society.name,
          },
          actor: {
            actorId: ctx.session.user.id,
            actorRole: ctx.session.user.role,
          },
          createdAt: ctx.now().toISOString(),
        });

        const updated = await ctx.db.$transaction(async (tx) => {
          const result = await tx.society.update({
            where: { id: society.id },
            data: {
              publishStatus: input.status,
              // Stamp publishedAt on first publish; keep it thereafter.
              ...(isPublishing && society.publishedAt === null
                ? { publishedAt: ctx.now() }
                : {}),
            },
          });
          await persistLedgerEvent(tx, event);
          return result;
        });

        return {
          ...toSocietyDto(updated),
          completeness: calculateSocietyCompleteness(updated),
        };
      } catch (error) {
        throw mapDomainError(error);
      }
    }),

  /**
   * Links a `SOCIETY_ADMIN` to a society, or clears all linked admins when
   * `userId` is null (platform-managed). Super-admin only — assigning who can
   * administer a society is a platform-governance action. Existing
   * `assertSocietyOwnership` continues to gate the society-portal writes once an
   * admin is linked.
   */
  assignAdmin: superAdminProcedure
    .input(societyAssignAdminInputSchema)
    .mutation(async ({ ctx, input }) => {
      const society = await ctx.db.society.findUnique({
        where: { id: input.societyId },
        select: { id: true },
      });
      if (society === null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Society not found." });
      }

      if (input.userId === null) {
        await ctx.db.user.updateMany({
          where: { societyId: society.id },
          data: { societyId: null },
        });
        return { societyId: society.id, adminUserId: null };
      }

      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { id: true, role: true },
      });
      if (user === null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }
      if (user.role !== UserRole.SOCIETY_ADMIN) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only a SOCIETY_ADMIN user can be assigned to a society.",
        });
      }

      await ctx.db.user.update({
        where: { id: user.id },
        data: { societyId: society.id },
      });
      return { societyId: society.id, adminUserId: user.id };
    }),

  /**
   * Bulk import of base society records (M0.5). Super-admin only. Idempotent
   * upsert keyed on `slug`; every row lands in `DRAFT`. `dryRun` validates and
   * reports what *would* happen without writing anything. Returns a per-row
   * report so a spreadsheet import is reviewable before publishing.
   */
  importBatch: superAdminProcedure
    .input(societyImportBatchInputSchema)
    .mutation(async ({ ctx, input }) => {
      const results: SocietyImportRowResult[] = [];

      for (const row of input.rows) {
        try {
          const city = cityLabelForSlug(row.citySlug);
          if (city === undefined) {
            results.push({
              slug: row.slug,
              outcome: "error",
              message: "Unknown city slug.",
            });
            continue;
          }

          const existing = await ctx.db.society.findUnique({
            where: { slug: row.slug },
            select: { id: true },
          });

          if (input.dryRun) {
            results.push({
              slug: row.slug,
              outcome: existing === null ? "created" : "updated",
              message: "Dry run — no changes written.",
            });
            continue;
          }

          if (existing === null) {
            const event = createLedgerEvent({
              id: toId(ctx.generateId()),
              type: LedgerEventType.SOCIETY_CREATED,
              entityId: toId("pending"),
              payload: { slug: row.slug, name: row.name, importedBatch: true },
              actor: {
                actorId: ctx.session.user.id,
                actorRole: ctx.session.user.role,
              },
              createdAt: ctx.now().toISOString(),
            });
            await ctx.db.$transaction(async (tx) => {
              const created = await tx.society.create({
                data: {
                  slug: row.slug,
                  name: row.name,
                  city,
                  citySlug: row.citySlug,
                  authority: row.authority,
                  description: "",
                  developmentStage: "Planning",
                  publishStatus: SocietyPublishStatus.DRAFT,
                  createdById: ctx.session.user.id,
                },
              });
              await persistLedgerEvent(tx, {
                ...event,
                entityId: toId(created.id),
              });
            });
            results.push({ slug: row.slug, outcome: "created" });
          } else {
            await ctx.db.society.update({
              where: { slug: row.slug },
              data: {
                name: row.name,
                city,
                citySlug: row.citySlug,
                authority: row.authority,
              },
            });
            results.push({ slug: row.slug, outcome: "updated" });
          }
        } catch {
          results.push({
            slug: row.slug,
            outcome: "error",
            message: "Failed to import this row.",
          });
        }
      }

      const summary = results.reduce(
        (acc, result) => ({ ...acc, [result.outcome]: acc[result.outcome] + 1 }),
        { created: 0, updated: 0, skipped: 0, error: 0 },
      );

      return { dryRun: input.dryRun, results, summary };
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

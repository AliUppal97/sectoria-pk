import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  EscrowState,
  LedgerEventType,
  PlotStatus,
  VerificationTier,
  idSchema,
  ledgerEventTypeSchema,
} from "@sectoria/types";
import { createLedgerEvent } from "@sectoria/domain-ledger";
import { router } from "../trpc.js";
import { superAdminProcedure } from "../procedures.js";
import { toLedgerEventDto } from "../lib/serialize.js";
import { persistLedgerEvent } from "../lib/persist-ledger-event.js";
import { toId } from "../lib/ids.js";
import { mapDomainError } from "../lib/map-domain-error.js";

const adminReasonSchema = z.string().trim().min(1, "A reason is required").max(500);

const reviewDecisionSchema = z.enum(["APPROVE", "REJECT"]);

function adminPayload(
  userId: string,
  reason: string,
  detail: Record<string, unknown>,
): Record<string, unknown> {
  return { userId, reason, ...detail };
}

/**
 * Platform-admin procedures: verification queue, audit ledger, disputes,
 * and revenue summaries. All gated to `SUPER_ADMIN` — cross-tenant reads and
 * writes allowed only here (see `auth-and-access-control.mdc`).
 */
export const adminRouter = router({
  /** High-level counts for the admin dashboard bento layout. */
  dashboardOverview: superAdminProcedure.query(async ({ ctx }) => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      pendingSocieties,
      pendingDealers,
      disputedPlots,
      completedTransfers,
      transfersThisMonth,
      recentEvents,
    ] = await Promise.all([
      ctx.db.society.count({
        where: { verificationTier: VerificationTier.PENDING },
      }),
      ctx.db.dealerProfile.count({
        where: {
          dnfbpVerified: false,
          dnfbpCertNumber: { not: null },
        },
      }),
      ctx.db.plot.count({ where: { status: PlotStatus.DISPUTED } }),
      ctx.db.booking.count({
        where: { status: EscrowState.COMMISSION_RELEASED },
      }),
      ctx.db.ledgerEvent.count({
        where: {
          type: LedgerEventType.COMMISSION_RELEASED,
          createdAt: { gte: monthStart },
        },
      }),
      ctx.db.ledgerEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      pendingSocieties,
      pendingDealers,
      disputedPlots,
      completedTransfers,
      transfersThisMonth,
      recentEvents: recentEvents.map(toLedgerEventDto),
    };
  }),

  /** Reads the append-only audit ledger, newest first, with optional filters. */
  listLedger: superAdminProcedure
    .input(
      z
        .object({
          entityId: idSchema.optional(),
          bookingId: idSchema.optional(),
          type: ledgerEventTypeSchema.optional(),
          dateFrom: z.string().datetime({ offset: true }).optional(),
          dateTo: z.string().datetime({ offset: true }).optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const events = await ctx.db.ledgerEvent.findMany({
        where: {
          ...(input?.entityId !== undefined
            ? { entityId: input.entityId }
            : {}),
          ...(input?.bookingId !== undefined
            ? { bookingId: input.bookingId }
            : {}),
          ...(input?.type !== undefined ? { type: input.type } : {}),
          ...(input?.dateFrom !== undefined || input?.dateTo !== undefined
            ? {
                createdAt: {
                  ...(input.dateFrom !== undefined
                    ? { gte: new Date(input.dateFrom) }
                    : {}),
                  ...(input.dateTo !== undefined
                    ? { lte: new Date(input.dateTo) }
                    : {}),
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
      });
      return events.map(toLedgerEventDto);
    }),

  /** Societies still awaiting LOP/NOC verification. */
  pendingSocietyVerifications: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.society.findMany({
      where: { verificationTier: VerificationTier.PENDING },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        city: true,
        authority: true,
        lopReferenceNo: true,
        nocReferenceNo: true,
        hsmsLinked: true,
        createdAt: true,
      },
    });
  }),

  /** Dealers who submitted a DNFBP certificate but await platform sign-off. */
  pendingDealerVerifications: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.dealerProfile.findMany({
      where: {
        dnfbpVerified: false,
        dnfbpCertNumber: { not: null },
      },
      orderBy: { agencyName: "asc" },
      select: {
        id: true,
        slug: true,
        agencyName: true,
        dnfbpCertNumber: true,
        user: { select: { name: true, phone: true } },
      },
    });
  }),

  /** Approve or reject a society's verification tier with a mandatory reason. */
  reviewSocietyVerification: superAdminProcedure
    .input(
      z.object({
        societyId: idSchema,
        decision: reviewDecisionSchema,
        reason: adminReasonSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const society = await ctx.db.society.findUnique({
          where: { id: input.societyId },
        });
        if (society === null) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Society not found." });
        }

        const nextTier =
          input.decision === "APPROVE"
            ? society.hsmsLinked
              ? VerificationTier.HSMS_LINKED
              : VerificationTier.VERIFIED
            : VerificationTier.PENDING;

        const event = createLedgerEvent({
          id: toId(ctx.generateId()),
          type: LedgerEventType.SOCIETY_VERIFICATION_REVIEWED,
          entityId: toId(society.id),
          payload: adminPayload(ctx.session.user.id, input.reason, {
            decision: input.decision,
            previousTier: society.verificationTier,
            newTier: nextTier,
            societyName: society.name,
          }),
          actor: {
            actorId: ctx.session.user.id,
            actorRole: ctx.session.user.role,
          },
          createdAt: ctx.now().toISOString(),
        });

        await ctx.db.$transaction(async (tx) => {
          await tx.society.update({
            where: { id: society.id },
            data: { verificationTier: nextTier },
          });
          await persistLedgerEvent(tx, event);
        });

        return { verificationTier: nextTier };
      } catch (error) {
        throw mapDomainError(error);
      }
    }),

  /** Approve or reject a dealer's DNFBP verification with a mandatory reason. */
  reviewDealerVerification: superAdminProcedure
    .input(
      z.object({
        dealerId: idSchema,
        decision: reviewDecisionSchema,
        reason: adminReasonSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const dealer = await ctx.db.dealerProfile.findUnique({
          where: { id: input.dealerId },
        });
        if (dealer === null) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Dealer not found." });
        }

        const verified = input.decision === "APPROVE";

        const event = createLedgerEvent({
          id: toId(ctx.generateId()),
          type: LedgerEventType.DEALER_VERIFICATION_REVIEWED,
          entityId: toId(dealer.id),
          payload: adminPayload(ctx.session.user.id, input.reason, {
            decision: input.decision,
            agencyName: dealer.agencyName,
            dnfbpCertNumber: dealer.dnfbpCertNumber,
            dnfbpVerified: verified,
          }),
          actor: {
            actorId: ctx.session.user.id,
            actorRole: ctx.session.user.role,
          },
          createdAt: ctx.now().toISOString(),
        });

        await ctx.db.$transaction(async (tx) => {
          await tx.dealerProfile.update({
            where: { id: dealer.id },
            data: { dnfbpVerified: verified },
          });
          await persistLedgerEvent(tx, event);
        });

        return { dnfbpVerified: verified };
      } catch (error) {
        throw mapDomainError(error);
      }
    }),

  /** Plots currently flagged as disputed. */
  listDisputedPlots: superAdminProcedure.query(async ({ ctx }) => {
    const plots = await ctx.db.plot.findMany({
      where: { status: PlotStatus.DISPUTED },
      orderBy: { serialNo: "asc" },
      include: {
        category: {
          select: {
            phase: true,
            block: true,
            sizeLabel: true,
            society: { select: { name: true, city: true } },
          },
        },
        booking: {
          select: {
            id: true,
            buyer: { select: { name: true } },
          },
        },
      },
    });

    return plots.map((plot) => ({
      id: plot.id,
      serialNo: plot.serialNo,
      plotNo: plot.plotNo,
      bookingId: plot.bookingId,
      buyerName: plot.booking?.buyer.name ?? null,
      categoryLabel: `${plot.category.phase}, ${plot.category.block} · ${plot.category.sizeLabel}`,
      societyName: plot.category.society.name,
      city: plot.category.society.city,
    }));
  }),

  /** Allocated or transferred plots that can be flagged for dispute. */
  listDisputablePlots: superAdminProcedure.query(async ({ ctx }) => {
    const plots = await ctx.db.plot.findMany({
      where: {
        status: { in: [PlotStatus.ALLOCATED, PlotStatus.TRANSFERRED] },
        bookingId: { not: null },
      },
      orderBy: { serialNo: "asc" },
      take: 100,
      include: {
        category: {
          select: {
            phase: true,
            block: true,
            sizeLabel: true,
            society: { select: { name: true, city: true } },
          },
        },
        booking: {
          select: {
            id: true,
            buyer: { select: { name: true } },
          },
        },
      },
    });

    return plots.map((plot) => ({
      id: plot.id,
      serialNo: plot.serialNo,
      plotNo: plot.plotNo,
      status: plot.status,
      bookingId: plot.bookingId,
      buyerName: plot.booking?.buyer.name ?? null,
      categoryLabel: `${plot.category.phase}, ${plot.category.block} · ${plot.category.sizeLabel}`,
      societyName: plot.category.society.name,
      city: plot.category.society.city,
    }));
  }),

  /** Flags a plot as disputed — requires a reason and writes an audit event. */
  flagPlotDispute: superAdminProcedure
    .input(
      z.object({
        plotId: idSchema,
        reason: adminReasonSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const plot = await ctx.db.plot.findUnique({
          where: { id: input.plotId },
          include: {
            category: { select: { society: { select: { name: true } } } },
          },
        });
        if (plot === null) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Plot not found." });
        }
        if (
          plot.status !== PlotStatus.ALLOCATED &&
          plot.status !== PlotStatus.TRANSFERRED
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only allocated or transferred plots can be flagged.",
          });
        }

        const previousStatus = plot.status;

        const event = createLedgerEvent({
          id: toId(ctx.generateId()),
          type: LedgerEventType.PLOT_DISPUTE_FLAGGED,
          entityId: toId(plot.id),
          bookingId: plot.bookingId !== null ? toId(plot.bookingId) : null,
          payload: adminPayload(ctx.session.user.id, input.reason, {
            previousStatus,
            societyName: plot.category.society.name,
            serialNo: plot.serialNo,
          }),
          actor: {
            actorId: ctx.session.user.id,
            actorRole: ctx.session.user.role,
          },
          createdAt: ctx.now().toISOString(),
        });

        await ctx.db.$transaction(async (tx) => {
          await tx.plot.update({
            where: { id: plot.id },
            data: { status: PlotStatus.DISPUTED },
          });
          await persistLedgerEvent(tx, event);
        });

        return { status: PlotStatus.DISPUTED };
      } catch (error) {
        throw mapDomainError(error);
      }
    }),

  /** Resolves a disputed plot — restores the prior status from the flag event. */
  resolvePlotDispute: superAdminProcedure
    .input(
      z.object({
        plotId: idSchema,
        reason: adminReasonSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const plot = await ctx.db.plot.findUnique({ where: { id: input.plotId } });
        if (plot === null) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Plot not found." });
        }
        if (plot.status !== PlotStatus.DISPUTED) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This plot is not in a disputed state.",
          });
        }

        const flagEvent = await ctx.db.ledgerEvent.findFirst({
          where: {
            entityId: plot.id,
            type: LedgerEventType.PLOT_DISPUTE_FLAGGED,
          },
          orderBy: { createdAt: "desc" },
        });

        const payload = flagEvent?.payload as Record<string, unknown> | undefined;
        const previousStatusRaw = payload?.previousStatus;
        const restoredStatus =
          previousStatusRaw === PlotStatus.TRANSFERRED
            ? PlotStatus.TRANSFERRED
            : PlotStatus.ALLOCATED;

        const event = createLedgerEvent({
          id: toId(ctx.generateId()),
          type: LedgerEventType.PLOT_DISPUTE_RESOLVED,
          entityId: toId(plot.id),
          bookingId: plot.bookingId !== null ? toId(plot.bookingId) : null,
          payload: adminPayload(ctx.session.user.id, input.reason, {
            restoredStatus,
            serialNo: plot.serialNo,
          }),
          actor: {
            actorId: ctx.session.user.id,
            actorRole: ctx.session.user.role,
          },
          createdAt: ctx.now().toISOString(),
        });

        await ctx.db.$transaction(async (tx) => {
          await tx.plot.update({
            where: { id: plot.id },
            data: { status: restoredStatus },
          });
          await persistLedgerEvent(tx, event);
        });

        return { status: restoredStatus };
      } catch (error) {
        throw mapDomainError(error);
      }
    }),

  /** Revenue summary — completed transfers, escrow released, commission by society. */
  revenueDashboard: superAdminProcedure.query(async ({ ctx }) => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [completedBookings, transfersThisMonth] = await Promise.all([
      ctx.db.booking.findMany({
        where: { status: EscrowState.COMMISSION_RELEASED },
        include: {
          category: {
            select: {
              societyId: true,
              sizeSqft: true,
              pricePerSqft: true,
              society: { select: { name: true } },
            },
          },
          dealer: { select: { id: true } },
        },
      }),
      ctx.db.ledgerEvent.count({
        where: {
          type: LedgerEventType.COMMISSION_RELEASED,
          createdAt: { gte: monthStart },
        },
      }),
    ]);

    const authorizations = await ctx.db.societyPartnerAuthorization.findMany({
      where: { status: "ACTIVE" },
      select: {
        societyId: true,
        dealerId: true,
        commissionSplitPct: true,
      },
    });

    const commissionRateKey = (societyId: string, dealerId: string) =>
      `${societyId}:${dealerId}`;
    const rateByKey = new Map<string, number>();
    for (const auth of authorizations) {
      rateByKey.set(
        commissionRateKey(auth.societyId, auth.dealerId),
        Number(auth.commissionSplitPct),
      );
    }

    let totalEscrowReleasedPkr = 0;
    const commissionBySociety = new Map<
      string,
      { societyId: string; societyName: string; commissionPkr: number; transferCount: number }
    >();

    for (const booking of completedBookings) {
      const salePricePkr = Math.round(
        booking.category.sizeSqft * Number(booking.category.pricePerSqft),
      );
      totalEscrowReleasedPkr += salePricePkr;

      const societyId = booking.category.societyId;
      const existing = commissionBySociety.get(societyId) ?? {
        societyId,
        societyName: booking.category.society.name,
        commissionPkr: 0,
        transferCount: 0,
      };
      existing.transferCount += 1;

      if (booking.dealer !== null) {
        const rate =
          rateByKey.get(commissionRateKey(societyId, booking.dealer.id)) ?? 0;
        existing.commissionPkr += Math.round((salePricePkr * rate) / 100);
      }

      commissionBySociety.set(societyId, existing);
    }

    return {
      transfersThisMonth,
      totalEscrowReleasedPkr,
      completedTransferCount: completedBookings.length,
      commissionBySociety: [...commissionBySociety.values()].sort((a, b) =>
        a.societyName.localeCompare(b.societyName),
      ),
    };
  }),

  /** Booking counts grouped by escrow state — the revenue funnel. */
  bookingFunnel: superAdminProcedure.query(async ({ ctx }) => {
    const grouped = await ctx.db.booking.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    return grouped.map((row) => ({
      status: row.status,
      count: row._count._all,
    }));
  }),
});

import { z } from "zod";
import {
  AtlStatus,
  AuthorizationStatus,
  EscrowAction,
  EscrowState,
  LedgerEventType,
  PlotStatus,
  UserRole,
  escrowActionSchema,
  idSchema,
  pkrAmountSchema,
} from "@sectoria/types";
import { Prisma, type PrismaClient } from "@sectoria/database";
import { calculateTransferTax } from "@sectoria/domain-tax";
import { transitionEscrowState } from "@sectoria/domain-escrow";
import { allocatePlot } from "@sectoria/domain-allocation";
import { createLedgerEvent } from "@sectoria/domain-ledger";
import { router, TRPCError, type Session } from "../trpc.js";
import {
  protectedProcedure,
  societyAdminProcedure,
  verifiedBuyerProcedure,
} from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";
import { mapDomainError } from "../lib/map-domain-error.js";
import { persistLedgerEvent } from "../lib/persist-ledger-event.js";
import { toId } from "../lib/ids.js";
import { toBookingDto, toLedgerEventDto } from "../lib/serialize.js";

/**
 * Booking & escrow procedures — the heart of the platform's money flow.
 *
 * Every mutation here follows the same discipline (see `api-trpc.mdc` and
 * `middleware-and-guards.mdc`): validate input → authorize (role + resource
 * ownership) → call the **pure** domain function (tax / allocation / escrow) →
 * persist its result and the {@link LedgerEventType} audit event it implies in a
 * **single** `db.$transaction`, so a booking's state and its audit trail can
 * never diverge. The escrow rules, tax math, and allocation strategy are never
 * re-implemented here — they are composed from `@sectoria/domain-*`.
 *
 * The seller of record is the society. Societies are registered entities, so the
 * seller side of the advance-tax calculation is modelled as a `FILER`; only the
 * buyer's ATL status varies and it is read from the buyer's record, never trusted
 * from client input.
 */
const SELLER_ATL_STATUS = AtlStatus.FILER;

/**
 * Whether `session` may read `booking`: the buyer who owns it, the dealer on it,
 * the administrator of the owning society, or platform staff. Throws otherwise.
 */
function assertBookingReadAccess(
  session: Session,
  booking: { buyerId: string },
  societyId: string,
  dealerUserId: string | null,
): void {
  if (booking.buyerId === session.user.id) return;
  if (dealerUserId !== null && dealerUserId === session.user.id) return;
  if (session.user.role === UserRole.SUPER_ADMIN) return;
  if (
    session.user.role === UserRole.SOCIETY_ADMIN &&
    session.user.societyId === societyId
  ) {
    return;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have access to this booking.",
  });
}

export const bookingRouter = router({
  /**
   * Creates a booking once the buyer has paid the booking token. Snapshots the
   * tax breakdown (frozen at booking time even if rate tables change later) and
   * records a `BOOKING_CREATED` ledger event in the same transaction. Restricted
   * to NADRA-verified buyers — a money-moving action.
   */
  create: verifiedBuyerProcedure
    .input(
      z.object({
        categoryId: idSchema,
        paymentPlanId: idSchema,
        dealerId: idSchema.optional(),
        /** The agreed sale price, in whole rupees. */
        agreedSalePrice: pkrAmountSchema,
        /** The FBR table value for the plot's valuation zone, in whole rupees. */
        fbrTableValue: pkrAmountSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const buyerId = ctx.session.user.id;
        const [buyer, category, paymentPlan] = await Promise.all([
          ctx.db.user.findUnique({ where: { id: buyerId } }),
          ctx.db.inventoryCategory.findUnique({
            where: { id: input.categoryId },
          }),
          ctx.db.paymentPlan.findUnique({ where: { id: input.paymentPlanId } }),
        ]);

        if (buyer === null) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Buyer not found." });
        }
        if (category === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Inventory category not found.",
          });
        }
        if (paymentPlan === null || paymentPlan.categoryId !== category.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Payment plan does not belong to this category.",
          });
        }

        // A dealer may only be attached if they hold a live authorization for
        // this society (and either this specific category or all categories).
        if (input.dealerId !== undefined) {
          const authorization =
            await ctx.db.societyPartnerAuthorization.findFirst({
              where: {
                dealerId: input.dealerId,
                societyId: category.societyId,
                status: AuthorizationStatus.ACTIVE,
                OR: [{ categoryId: category.id }, { categoryId: null }],
              },
            });
          if (authorization === null) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "This dealer is not authorized to sell for this category.",
            });
          }
        }

        // Pure domain call: compute the tax snapshot. Buyer ATL comes from the
        // server-side record, never the request.
        const taxBreakdown = calculateTransferTax({
          salePrice: input.agreedSalePrice,
          fbrTableValue: input.fbrTableValue,
          sellerAtlStatus: SELLER_ATL_STATUS,
          buyerAtlStatus: buyer.atlStatus,
          plotType: category.plotType,
        });

        const occurredAt = ctx.now().toISOString();

        return await ctx.db.$transaction(async (tx) => {
          const booking = await tx.booking.create({
            data: {
              buyerId,
              categoryId: category.id,
              paymentPlanId: paymentPlan.id,
              dealerId: input.dealerId ?? null,
              status: EscrowState.BOOKING_TOKEN_PAID,
              taxBreakdown: taxBreakdown as unknown as Prisma.InputJsonValue,
            },
          });

          const event = createLedgerEvent({
            id: toId(ctx.generateId()),
            type: LedgerEventType.BOOKING_CREATED,
            entityId: toId(booking.id),
            bookingId: toId(booking.id),
            payload: { categoryId: category.id, status: booking.status },
            actor: {
              actorId: ctx.session.user.id,
              actorRole: ctx.session.user.role,
            },
            createdAt: occurredAt,
          });
          await persistLedgerEvent(tx, event);

          return toBookingDto(booking);
        });
      } catch (error) {
        throw mapDomainError(error);
      }
    }),

  /** Fetches one booking plus its full audit trail, scoped to authorized readers. */
  getById: protectedProcedure
    .input(z.object({ bookingId: idSchema }))
    .query(async ({ ctx, input }) => {
      const booking = await ctx.db.booking.findUnique({
        where: { id: input.bookingId },
        include: {
          category: true,
          allocatedPlot: true,
          dealer: true,
          events: { orderBy: { createdAt: "asc" } },
        },
      });
      if (booking === null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found." });
      }

      assertBookingReadAccess(
        ctx.session,
        booking,
        booking.category.societyId,
        booking.dealer?.userId ?? null,
      );

      return {
        booking: toBookingDto(booking, booking.allocatedPlot?.id ?? null),
        events: booking.events.map(toLedgerEventDto),
      };
    }),

  /** Lists the calling buyer's own bookings, newest first. */
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const bookings = await ctx.db.booking.findMany({
      where: { buyerId: ctx.session.user.id },
      include: { allocatedPlot: true },
      orderBy: { createdAt: "desc" },
    });
    return bookings.map((booking) =>
      toBookingDto(booking, booking.allocatedPlot?.id ?? null),
    );
  }),

  /**
   * Allocates a plot to a token-paid booking and advances escrow
   * `BOOKING_TOKEN_PAID → ALLOCATED`. The allocation decision (FIFO vs ballot),
   * the escrow transition, and the audit event are all produced by pure domain
   * functions; this procedure persists the plot assignment, the booking's new
   * state, the decremented availability, and the ledger event **atomically**.
   *
   * Idempotent: an already-`ALLOCATED` booking is returned unchanged rather than
   * double-allocating (guards against a retried call). Restricted to the
   * administrator of the society that owns the category.
   */
  allocate: societyAdminProcedure
    .input(z.object({ bookingId: idSchema }))
    .mutation(async ({ ctx, input }) => {
      try {
        const booking = await ctx.db.booking.findUnique({
          where: { id: input.bookingId },
        });
        if (booking === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking not found.",
          });
        }

        const category = await ctx.db.inventoryCategory.findUnique({
          where: { id: booking.categoryId },
          include: {
            plots: {
              where: { status: PlotStatus.AVAILABLE },
              orderBy: { serialNo: "asc" },
            },
          },
        });
        if (category === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Inventory category not found.",
          });
        }

        assertSocietyOwnership(ctx.session, category.societyId);

        // Idempotency: a retried allocation must not assign a second plot.
        if (booking.status === EscrowState.ALLOCATED) {
          return { booking: toBookingDto(booking), allocatedPlotId: null };
        }

        // Pure allocation decision from a point-in-time snapshot of the category.
        const allocation = allocatePlot(
          {
            categoryId: toId(category.id),
            allocationStrategy: category.allocationStrategy,
            availablePlots: category.plots.map((plot) => ({
              plotId: toId(plot.id),
              serialNo: plot.serialNo,
              ...(plot.plotNo !== null ? { plotNo: plot.plotNo } : {}),
            })),
          },
          { bookingId: toId(booking.id), buyerId: toId(booking.buyerId) },
        );

        // A ballot category defers assignment to the deterministic draw
        // (`packages/domain/balloting`); escrow stays put until then.
        if (allocation.outcome !== "ASSIGNED") {
          return {
            booking: toBookingDto(booking),
            allocatedPlotId: null,
          };
        }

        const occurredAt = ctx.now().toISOString();
        const { nextState, event: escrowEvent } = transitionEscrowState({
          currentState: booking.status,
          action: EscrowAction.ALLOCATE,
          bookingId: toId(booking.id),
          occurredAt,
          metadata: { plotId: allocation.plot.plotId },
        });

        const ledgerEvent = createLedgerEvent({
          id: toId(ctx.generateId()),
          type: LedgerEventType.ESCROW_TRANSITIONED,
          entityId: toId(booking.id),
          bookingId: toId(booking.id),
          payload: {
            action: escrowEvent.action,
            fromState: escrowEvent.fromState,
            toState: escrowEvent.toState,
            plotId: allocation.plot.plotId,
          },
          actor: {
            actorId: ctx.session.user.id,
            actorRole: ctx.session.user.role,
          },
          createdAt: occurredAt,
        });

        const updated = await ctx.db.$transaction(async (tx) => {
          const updatedBooking = await tx.booking.update({
            where: { id: booking.id },
            data: { status: nextState },
          });
          await tx.plot.update({
            where: { id: allocation.plot.plotId },
            data: { status: PlotStatus.ALLOCATED, bookingId: booking.id },
          });
          await tx.inventoryCategory.update({
            where: { id: category.id },
            data: { availableUnits: { decrement: 1 } },
          });
          await persistLedgerEvent(tx, ledgerEvent);
          return updatedBooking;
        });

        return {
          booking: toBookingDto(updated, allocation.plot.plotId),
          allocatedPlotId: allocation.plot.plotId,
        };
      } catch (error) {
        throw mapDomainError(error);
      }
    }),

  /**
   * Advances escrow through a milestone (raise/pay installment, complete
   * payment, issue documents, release commission). The legal-transition check
   * lives entirely in the escrow state machine; this procedure only persists the
   * new state and its ledger event atomically. Restricted to the owning society's
   * administrator.
   */
  advance: societyAdminProcedure
    .input(
      z.object({
        bookingId: idSchema,
        action: escrowActionSchema,
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // `allocate` and `cancel` have dedicated procedures (they touch plots /
        // refundability); `advance` covers only the milestone transitions.
        if (
          input.action === EscrowAction.ALLOCATE ||
          input.action === EscrowAction.CANCEL
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Use the dedicated ${input.action === EscrowAction.ALLOCATE ? "allocate" : "cancel"} procedure for this action.`,
          });
        }

        const booking = await ctx.db.booking.findUnique({
          where: { id: input.bookingId },
          include: { category: { select: { societyId: true } } },
        });
        if (booking === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking not found.",
          });
        }
        assertSocietyOwnership(ctx.session, booking.category.societyId);

        return await applyEscrowTransition(ctx, booking, input.action, {
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        });
      } catch (error) {
        throw mapDomainError(error);
      }
    }),

  /**
   * Cancels a booking while its funds are still refundable (the escrow machine
   * forbids cancelling once documents have issued). Allowed for the buyer who
   * owns it or the owning society's administrator.
   */
  cancel: protectedProcedure
    .input(
      z.object({ bookingId: idSchema, reason: z.string().min(1).optional() }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const booking = await ctx.db.booking.findUnique({
          where: { id: input.bookingId },
          include: { category: { select: { societyId: true } } },
        });
        if (booking === null) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking not found.",
          });
        }

        const isOwningBuyer = booking.buyerId === ctx.session.user.id;
        if (!isOwningBuyer) {
          assertSocietyOwnership(ctx.session, booking.category.societyId);
        }

        return await applyEscrowTransition(ctx, booking, EscrowAction.CANCEL, {
          ...(input.reason !== undefined
            ? { metadata: { reason: input.reason } }
            : {}),
        });
      } catch (error) {
        throw mapDomainError(error);
      }
    }),
});

/**
 * Shared escrow-transition + ledger persistence used by `advance` and `cancel`.
 * Validates the transition via the pure state machine, then commits the new
 * state and the audit event in one transaction.
 */
async function applyEscrowTransition(
  ctx: {
    db: PrismaClient;
    now: () => Date;
    generateId: () => string;
    session: Session;
  },
  booking: { id: string; status: EscrowState },
  action: EscrowAction,
  options: { metadata?: Record<string, unknown> },
) {
  const occurredAt = ctx.now().toISOString();
  const { nextState, event: escrowEvent } = transitionEscrowState({
    currentState: booking.status,
    action,
    bookingId: toId(booking.id),
    occurredAt,
    ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
  });

  const ledgerEvent = createLedgerEvent({
    id: toId(ctx.generateId()),
    type: LedgerEventType.ESCROW_TRANSITIONED,
    entityId: toId(booking.id),
    bookingId: toId(booking.id),
    payload: {
      action: escrowEvent.action,
      fromState: escrowEvent.fromState,
      toState: escrowEvent.toState,
    },
    actor: { actorId: ctx.session.user.id, actorRole: ctx.session.user.role },
    createdAt: occurredAt,
  });

  const updated = await ctx.db.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: { status: nextState },
    });
    await persistLedgerEvent(tx, ledgerEvent);
    return updatedBooking;
  });

  return { booking: toBookingDto(updated), allocatedPlotId: null };
}

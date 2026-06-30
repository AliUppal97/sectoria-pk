import { z } from "zod";
import { FulfillmentStatus, LedgerEventType, idSchema } from "@sectoria/types";
import { createLedgerEvent } from "@sectoria/domain-ledger";
import { router, TRPCError } from "../trpc.js";
import { dealerProcedure, opsProcedure } from "../procedures.js";
import { persistLedgerEvent } from "../lib/persist-ledger-event.js";
import { toId } from "../lib/ids.js";

function toFulfillmentDto(order: {
  id: string;
  quoteId: string;
  dealerId: string;
  orderRef: string;
  status: string;
  plotRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: order.id,
    quoteId: order.quoteId,
    orderRef: order.orderRef,
    status: order.status,
    plotRef: order.plotRef,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export const fulfillmentRouter = router({
  listForDealer: dealerProcedure.query(async ({ ctx }) => {
    const dealer = await ctx.db.dealerProfile.findUnique({
      where: { userId: ctx.session.user.id },
      select: { id: true },
    });
    if (dealer === null) return [];

    const orders = await ctx.db.fulfillmentOrder.findMany({
      where: { dealerId: dealer.id },
      include: {
        quote: {
          select: {
            category: {
              select: {
                phase: true,
                block: true,
                sizeLabel: true,
                society: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((order) => ({
      ...toFulfillmentDto(order),
      societyName: order.quote.category.society.name,
      categoryLabel: `${order.quote.category.phase} · ${order.quote.category.block} · ${order.quote.category.sizeLabel}`,
    }));
  }),

  listAll: opsProcedure.query(async ({ ctx }) => {
    const orders = await ctx.db.fulfillmentOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        quote: {
          select: {
            quotedPricePkr: true,
            spreadPkr: true,
            lead: { select: { name: true } },
          },
        },
        dealer: { select: { agencyName: true } },
      },
    });
    return orders.map((order) => ({
      ...toFulfillmentDto(order),
      dealerAgencyName: order.dealer.agencyName,
      quotedPricePkr: order.quote.quotedPricePkr,
      spreadPkr: order.quote.spreadPkr,
      leadName: order.quote.lead.name,
    }));
  }),

  markAllocated: dealerProcedure
    .input(z.object({ orderId: idSchema, plotRef: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const dealer = await ctx.db.dealerProfile.findUnique({
        where: { userId: ctx.session.user.id },
        select: { id: true },
      });
      if (dealer === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dealer profile not found.",
        });
      }

      const existing = await ctx.db.fulfillmentOrder.findUnique({
        where: { id: input.orderId },
      });
      if (existing === null || existing.dealerId !== dealer.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Fulfillment order not found.",
        });
      }

      const updated = await ctx.db.$transaction(async (tx) => {
        const order = await tx.fulfillmentOrder.update({
          where: { id: input.orderId },
          data: {
            status: FulfillmentStatus.ALLOCATED,
            plotRef: input.plotRef,
          },
        });

        const event = createLedgerEvent({
          id: toId(ctx.generateId()),
          type: LedgerEventType.FULFILLMENT_UPDATED,
          entityId: toId(order.id),
          payload: { plotRef: input.plotRef, status: FulfillmentStatus.ALLOCATED },
          actor: {
            actorId: ctx.session.user.id,
            actorRole: ctx.session.user.role,
          },
          createdAt: ctx.now().toISOString(),
        });
        await persistLedgerEvent(tx, event);
        return order;
      });

      return toFulfillmentDto(updated);
    }),
});

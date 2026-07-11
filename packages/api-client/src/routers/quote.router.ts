import { z } from "zod";
import {
  FulfillmentStatus,
  LeadStatus,
  LedgerEventType,
  QuotePaymentStatus,
  QuotePaymentType,
  QuoteStatus,
  createQuoteDraftInputSchema,
  idSchema,
  installmentIntervalSchema,
  pkrAmountSchema,
} from "@sectoria/types";
import { createLedgerEvent } from "@sectoria/domain-ledger";
import { router, TRPCError } from "../trpc.js";
import {
  opsProcedure,
  protectedProcedure,
  superAdminProcedure,
} from "../procedures.js";
import { calculateQuoteMargin } from "../lib/calculate-quote-margin.js";
import {
  DEFAULT_INSTALLMENT_SERVICING_FEE_PCT,
  deriveQuoteInstallmentSchedule,
  findNextUnpaidInstallmentIndex,
  matchPaymentPlanByLabel,
} from "../lib/derive-quote-installment-schedule.js";
import { persistLedgerEvent } from "../lib/persist-ledger-event.js";
import { assertNoForbiddenBuyerFields } from "../lib/society-profile-dto.js";
import { toId } from "../lib/ids.js";

function toQuoteDto(quote: {
  id: string;
  leadId: string;
  societyId: string;
  categoryId: string;
  dealerId: string;
  dealerNetPkr: number;
  quotedPricePkr: number;
  spreadPkr: number;
  tokenAmountPkr: number;
  validUntil: Date;
  status: string;
  paymentPlanLabel: string | null;
  installmentsDirect: boolean;
  createdById: string;
  buyerUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: quote.id,
    leadId: quote.leadId,
    societyId: quote.societyId,
    categoryId: quote.categoryId,
    dealerId: quote.dealerId,
    quotedPricePkr: quote.quotedPricePkr,
    tokenAmountPkr: quote.tokenAmountPkr,
    validUntil: quote.validUntil.toISOString(),
    status: quote.status,
    paymentPlanLabel: quote.paymentPlanLabel,
    installmentsDirect: quote.installmentsDirect,
    buyerUserId: quote.buyerUserId,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
  };
}

/** Buyer-safe quote — never includes dealer net or spread. */
function toBuyerQuoteDto(quote: Parameters<typeof toQuoteDto>[0]) {
  const dto = toQuoteDto(quote);
  return dto;
}

type QuoteWithPayments = {
  quotedPricePkr: number;
  tokenAmountPkr: number;
  paymentPlanLabel: string | null;
  installmentsDirect: boolean;
  payments: Array<{
    type: string;
    installmentIndex: number | null;
    status: string;
    createdAt: Date;
  }>;
};

type PaymentPlanRow = {
  label: string;
  installmentCount: number;
  installmentInterval: string;
};

function toSchedulePaymentPlan(
  plan: PaymentPlanRow,
): Parameters<typeof deriveQuoteInstallmentSchedule>[0]["paymentPlan"] {
  return {
    label: plan.label,
    installmentCount: plan.installmentCount,
    installmentInterval: installmentIntervalSchema.parse(plan.installmentInterval),
  };
}

function paidInstallmentIndexes(
  payments: QuoteWithPayments["payments"],
): Set<number> {
  const indexes = new Set<number>();
  for (const payment of payments) {
    if (
      payment.type === QuotePaymentType.INSTALLMENT &&
      payment.status === QuotePaymentStatus.CONFIRMED &&
      payment.installmentIndex !== null
    ) {
      indexes.add(payment.installmentIndex);
    }
  }
  return indexes;
}

function tokenPaymentDate(payments: QuoteWithPayments["payments"]): Date | null {
  const tokenPayment = payments.find(
    (payment) =>
      payment.type === QuotePaymentType.TOKEN &&
      payment.status === QuotePaymentStatus.CONFIRMED,
  );
  return tokenPayment?.createdAt ?? null;
}

function buildBuyerInstallmentSchedule(
  quote: QuoteWithPayments,
  paymentPlans: readonly PaymentPlanRow[],
) {
  if (quote.installmentsDirect) {
    return { installmentSchedule: [] as const, nextInstallmentIndex: null };
  }

  const plan = matchPaymentPlanByLabel(paymentPlans, quote.paymentPlanLabel);
  if (plan === null || plan.installmentCount <= 0) {
    return { installmentSchedule: [] as const, nextInstallmentIndex: null };
  }

  const anchor = tokenPaymentDate(quote.payments);
  if (anchor === null) {
    return { installmentSchedule: [] as const, nextInstallmentIndex: null };
  }

  const schedule = deriveQuoteInstallmentSchedule({
    quotedPricePkr: quote.quotedPricePkr,
    tokenAmountPkr: quote.tokenAmountPkr,
    paymentPlan: toSchedulePaymentPlan(plan),
    scheduleAnchor: anchor,
    paidInstallmentIndexes: paidInstallmentIndexes(quote.payments),
  });

  return {
    installmentSchedule: schedule,
    nextInstallmentIndex: findNextUnpaidInstallmentIndex(schedule),
  };
}

/** Ops quote with margin fields. */
function toOpsQuoteDto(quote: Parameters<typeof toQuoteDto>[0]) {
  return {
    ...toQuoteDto(quote),
    dealerNetPkr: quote.dealerNetPkr,
    spreadPkr: quote.spreadPkr,
  };
}

export const quoteRouter = router({
  createDraft: opsProcedure
    .input(createQuoteDraftInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { spreadPkr } = calculateQuoteMargin({
        dealerNetPkr: input.dealerNetPkr,
        quotedPricePkr: input.quotedPricePkr,
      });

      const quote = await ctx.db.quote.create({
        data: {
          leadId: input.leadId,
          societyId: input.societyId,
          categoryId: input.categoryId,
          dealerId: input.dealerId,
          dealerNetPkr: input.dealerNetPkr,
          quotedPricePkr: input.quotedPricePkr,
          spreadPkr,
          tokenAmountPkr: input.tokenAmountPkr,
          validUntil: new Date(input.validUntil),
          status: QuoteStatus.DRAFT,
          paymentPlanLabel: input.paymentPlanLabel ?? null,
          createdById: ctx.session.user.id,
        },
      });

      await ctx.db.lead.update({
        where: { id: input.leadId },
        data: { status: LeadStatus.QUOTED },
      });

      return toOpsQuoteDto(quote);
    }),

  send: opsProcedure
    .input(z.object({ quoteId: idSchema, buyerUserId: idSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.quote.findUnique({
        where: { id: input.quoteId },
      });
      if (existing === null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found." });
      }

      const quote = await ctx.db.$transaction(async (tx) => {
        const updated = await tx.quote.update({
          where: { id: input.quoteId },
          data: {
            status: QuoteStatus.SENT,
            buyerUserId: input.buyerUserId ?? existing.buyerUserId,
          },
        });

        const event = createLedgerEvent({
          id: toId(ctx.generateId()),
          type: LedgerEventType.QUOTE_SENT,
          entityId: toId(updated.id),
          payload: {
            quotedPricePkr: updated.quotedPricePkr,
            tokenAmountPkr: updated.tokenAmountPkr,
          },
          actor: {
            actorId: ctx.session.user.id,
            actorRole: ctx.session.user.role,
          },
          createdAt: ctx.now().toISOString(),
        });
        await persistLedgerEvent(tx, event);
        return updated;
      });

      return toOpsQuoteDto(quote);
    }),

  accept: protectedProcedure
    .input(z.object({ quoteId: idSchema }))
    .mutation(async ({ ctx, input }) => {
      const quote = await ctx.db.quote.findUnique({
        where: { id: input.quoteId },
      });
      if (quote === null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found." });
      }
      if (quote.buyerUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only accept quotes sent to you.",
        });
      }
      if (quote.status !== QuoteStatus.SENT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only sent quotes can be accepted.",
        });
      }

      const updated = await ctx.db.$transaction(async (tx) => {
        const result = await tx.quote.update({
          where: { id: input.quoteId },
          data: { status: QuoteStatus.ACCEPTED },
        });
        const event = createLedgerEvent({
          id: toId(ctx.generateId()),
          type: LedgerEventType.QUOTE_ACCEPTED,
          entityId: toId(result.id),
          payload: {},
          actor: {
            actorId: ctx.session.user.id,
            actorRole: ctx.session.user.role,
          },
          createdAt: ctx.now().toISOString(),
        });
        await persistLedgerEvent(tx, event);
        return result;
      });

      return toBuyerQuoteDto(updated);
    }),

  listForLead: opsProcedure
    .input(z.object({ leadId: idSchema }))
    .query(async ({ ctx, input }) => {
      const quotes = await ctx.db.quote.findMany({
        where: { leadId: input.leadId },
        include: {
          payments: {
            where: { status: QuotePaymentStatus.CONFIRMED },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return quotes.map((quote) => ({
        ...toOpsQuoteDto(quote),
        tokenPaid: quote.payments.some(
          (payment) => payment.type === QuotePaymentType.TOKEN,
        ),
      }));
    }),

  listForBuyer: protectedProcedure.query(async ({ ctx }) => {
    const quotes = await ctx.db.quote.findMany({
      where: { buyerUserId: ctx.session.user.id },
      include: {
        payments: {
          where: { status: QuotePaymentStatus.CONFIRMED },
        },
        category: {
          include: { paymentPlans: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const payload = quotes.map((quote) => {
      const { installmentSchedule, nextInstallmentIndex } =
        buildBuyerInstallmentSchedule(quote, quote.category.paymentPlans);
      return {
        ...toBuyerQuoteDto(quote),
        tokenPaid: quote.payments.some(
          (payment) => payment.type === QuotePaymentType.TOKEN,
        ),
        installmentsPaidPkr: quote.payments
          .filter((payment) => payment.type === QuotePaymentType.INSTALLMENT)
          .reduce((sum, payment) => sum + payment.amountPkr, 0),
        installmentSchedule,
        nextInstallmentIndex,
      };
    });
    assertNoForbiddenBuyerFields(payload);
    return payload;
  }),

  getByIdOps: opsProcedure
    .input(z.object({ quoteId: idSchema }))
    .query(async ({ ctx, input }) => {
      const quote = await ctx.db.quote.findUnique({
        where: { id: input.quoteId },
      });
      if (quote === null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found." });
      }
      return toOpsQuoteDto(quote);
    }),

  payToken: protectedProcedure
    .input(z.object({ quoteId: idSchema }))
    .mutation(async ({ ctx, input }) => {
      const quote = await ctx.db.quote.findUnique({
        where: { id: input.quoteId },
      });
      if (quote === null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found." });
      }
      if (quote.buyerUserId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your quote." });
      }
      if (quote.status !== QuoteStatus.ACCEPTED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Accept the quote before paying the token.",
        });
      }

      const existingPayment = await ctx.db.quotePayment.findFirst({
        where: {
          quoteId: quote.id,
          type: QuotePaymentType.TOKEN,
          status: QuotePaymentStatus.CONFIRMED,
        },
      });
      if (existingPayment !== null) {
        return toBuyerQuoteDto(quote);
      }

      const eventId = ctx.generateId();

      await ctx.db.$transaction(async (tx) => {
        await tx.quotePayment.create({
          data: {
            quoteId: quote.id,
            type: QuotePaymentType.TOKEN,
            amountPkr: quote.tokenAmountPkr,
            status: QuotePaymentStatus.CONFIRMED,
            externalEventId: eventId,
          },
        });

        const orderRef = `FO-${quote.id.slice(-8).toUpperCase()}`;
        await tx.fulfillmentOrder.create({
          data: {
            quoteId: quote.id,
            dealerId: quote.dealerId,
            orderRef,
            status: FulfillmentStatus.PENDING,
          },
        });

        const ledger = createLedgerEvent({
          id: toId(ctx.generateId()),
          type: LedgerEventType.QUOTE_PAYMENT_CONFIRMED,
          entityId: toId(quote.id),
          payload: {
            type: QuotePaymentType.TOKEN,
            amountPkr: quote.tokenAmountPkr,
            externalEventId: eventId,
          },
          actor: {
            actorId: ctx.session.user.id,
            actorRole: ctx.session.user.role,
          },
          createdAt: ctx.now().toISOString(),
        });
        await persistLedgerEvent(tx, ledger);
      });

      const refreshed = await ctx.db.quote.findUniqueOrThrow({
        where: { id: quote.id },
      });
      return toBuyerQuoteDto(refreshed);
    }),

  payInstallment: protectedProcedure
    .input(
      z.object({
        quoteId: idSchema,
        installmentIndex: z.number().int().nonnegative(),
        amountPkr: pkrAmountSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const quote = await ctx.db.quote.findUnique({
        where: { id: input.quoteId },
        include: {
          payments: {
            where: { status: QuotePaymentStatus.CONFIRMED },
          },
          category: {
            include: { paymentPlans: true },
          },
        },
      });
      if (quote === null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found." });
      }
      if (quote.buyerUserId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your quote." });
      }
      if (quote.installmentsDirect) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Installments for this quote are collected off-platform.",
        });
      }
      if (quote.status !== QuoteStatus.ACCEPTED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Accept the quote before paying installments.",
        });
      }
      const tokenPaid = quote.payments.some(
        (payment) => payment.type === QuotePaymentType.TOKEN,
      );
      if (!tokenPaid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pay the booking token before installments.",
        });
      }

      const existingPayment = await ctx.db.quotePayment.findFirst({
        where: {
          quoteId: quote.id,
          type: QuotePaymentType.INSTALLMENT,
          installmentIndex: input.installmentIndex,
          status: QuotePaymentStatus.CONFIRMED,
        },
      });
      if (existingPayment !== null) {
        return { ok: true as const, alreadyPaid: true as const };
      }

      const { installmentSchedule, nextInstallmentIndex } =
        buildBuyerInstallmentSchedule(quote, quote.category.paymentPlans);
      if (installmentSchedule.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No installment schedule is configured for this quote.",
        });
      }
      if (nextInstallmentIndex === null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All installments for this quote are already paid.",
        });
      }
      if (input.installmentIndex !== nextInstallmentIndex) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Pay installment ${nextInstallmentIndex + 1} next.`,
        });
      }

      const scheduledRow = installmentSchedule.find(
        (row) => row.index === input.installmentIndex,
      );
      if (scheduledRow === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Installment index is outside the payment schedule.",
        });
      }

      const amountPkr = scheduledRow.amountPkr;
      if (
        input.amountPkr !== undefined &&
        input.amountPkr !== scheduledRow.amountPkr
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Installment amount does not match the schedule.",
        });
      }

      const eventId = ctx.generateId();
      await ctx.db.$transaction(async (tx) => {
        await tx.quotePayment.create({
          data: {
            quoteId: quote.id,
            type: QuotePaymentType.INSTALLMENT,
            amountPkr,
            installmentIndex: input.installmentIndex,
            status: QuotePaymentStatus.CONFIRMED,
            externalEventId: eventId,
          },
        });
        const ledger = createLedgerEvent({
          id: toId(ctx.generateId()),
          type: LedgerEventType.QUOTE_PAYMENT_CONFIRMED,
          entityId: toId(quote.id),
          payload: {
            type: QuotePaymentType.INSTALLMENT,
            amountPkr,
            installmentIndex: input.installmentIndex,
            platformFee: {
              spreadPkr: quote.spreadPkr,
              tokenAmountPkr: quote.tokenAmountPkr,
              servicingFeePct: DEFAULT_INSTALLMENT_SERVICING_FEE_PCT,
            },
          },
          actor: {
            actorId: ctx.session.user.id,
            actorRole: ctx.session.user.role,
          },
          createdAt: ctx.now().toISOString(),
        });
        await persistLedgerEvent(tx, ledger);
      });

      return { ok: true as const, alreadyPaid: false as const };
    }),

  markDealWon: opsProcedure
    .input(z.object({ leadId: idSchema, installmentsDirect: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.db.lead.update({
        where: { id: input.leadId },
        data: { status: LeadStatus.WON },
      });
      if (input.installmentsDirect !== undefined) {
        await ctx.db.quote.updateMany({
          where: { leadId: input.leadId, status: QuoteStatus.ACCEPTED },
          data: { installmentsDirect: input.installmentsDirect },
        });
      }
      return { leadId: lead.id, status: lead.status };
    }),

  remittanceSummary: superAdminProcedure.query(async ({ ctx }) => {
    const completedQuotes = await ctx.db.quote.findMany({
      where: {
        status: QuoteStatus.ACCEPTED,
        payments: { some: { status: QuotePaymentStatus.CONFIRMED } },
      },
      include: { payments: true },
    });

    let totalSpreadPkr = 0;
    let totalCollectedPkr = 0;
    for (const quote of completedQuotes) {
      totalSpreadPkr += quote.spreadPkr;
      for (const payment of quote.payments) {
        if (payment.status === QuotePaymentStatus.CONFIRMED) {
          totalCollectedPkr += payment.amountPkr;
        }
      }
    }

    return {
      quoteCount: completedQuotes.length,
      totalSpreadPkr,
      totalCollectedPkr,
      totalDealerNetPkr: completedQuotes.reduce(
        (sum, quote) => sum + quote.dealerNetPkr,
        0,
      ),
    };
  }),

  listPendingRemittance: superAdminProcedure.query(async ({ ctx }) => {
    const quotes = await ctx.db.quote.findMany({
      where: {
        status: QuoteStatus.ACCEPTED,
        payments: {
          some: {
            type: QuotePaymentType.TOKEN,
            status: QuotePaymentStatus.CONFIRMED,
          },
        },
      },
      include: { society: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });

    const remitted = await ctx.db.ledgerEvent.findMany({
      where: { type: LedgerEventType.PLATFORM_REMITTANCE },
      select: { entityId: true },
    });
    const remittedIds = new Set(remitted.map((event) => event.entityId));

    return quotes
      .filter((quote) => !remittedIds.has(quote.id))
      .map((quote) => ({
        quoteId: quote.id,
        societyName: quote.society.name,
        dealerNetPkr: quote.dealerNetPkr,
        spreadPkr: quote.spreadPkr,
        quotedPricePkr: quote.quotedPricePkr,
      }));
  }),

  recordRemittance: superAdminProcedure
    .input(
      z.object({
        quoteId: idSchema,
        reason: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const quote = await ctx.db.quote.findUnique({
        where: { id: input.quoteId },
      });
      if (quote === null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found." });
      }

      const tokenPaid = await ctx.db.quotePayment.findFirst({
        where: {
          quoteId: quote.id,
          type: QuotePaymentType.TOKEN,
          status: QuotePaymentStatus.CONFIRMED,
        },
      });
      if (tokenPaid === null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token payment must be confirmed before remittance.",
        });
      }

      const existing = await ctx.db.ledgerEvent.findFirst({
        where: {
          type: LedgerEventType.PLATFORM_REMITTANCE,
          entityId: quote.id,
        },
      });
      if (existing !== null) {
        return { quoteId: quote.id, alreadyRecorded: true as const };
      }

      const event = createLedgerEvent({
        id: toId(ctx.generateId()),
        type: LedgerEventType.PLATFORM_REMITTANCE,
        entityId: toId(quote.id),
        payload: {
          dealerNetPkr: quote.dealerNetPkr,
          spreadPkr: quote.spreadPkr,
          reason: input.reason,
        },
        actor: {
          actorId: ctx.session.user.id,
          actorRole: ctx.session.user.role,
        },
        createdAt: ctx.now().toISOString(),
      });

      await ctx.db.$transaction(async (tx) => {
        await persistLedgerEvent(tx, event);
      });

      return { quoteId: quote.id, alreadyRecorded: false as const };
    }),
});

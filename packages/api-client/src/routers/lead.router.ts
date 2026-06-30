import { z } from "zod";
import {
  LeadStatus,
  LeadSource,
  LedgerEventType,
  UserRole,
  createLeadInputSchema,
  idSchema,
  leadStatusSchema,
} from "@sectoria/types";
import { createLedgerEvent } from "@sectoria/domain-ledger";
import { router, TRPCError } from "../trpc.js";
import { opsProcedure, protectedProcedure, publicProcedure } from "../procedures.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { persistLedgerEvent } from "../lib/persist-ledger-event.js";
import { toId } from "../lib/ids.js";

function toLeadDto(lead: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  societyIds: string[];
  categoryId: string | null;
  budgetPkr: number | null;
  paymentPlanPreference: string | null;
  source: string;
  status: string;
  notes: string | null;
  buyerUserId: string | null;
  assignedAdvisorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    societyIds: lead.societyIds,
    categoryId: lead.categoryId,
    budgetPkr: lead.budgetPkr,
    paymentPlanPreference: lead.paymentPlanPreference,
    source: lead.source,
    status: lead.status,
    notes: lead.notes,
    buyerUserId: lead.buyerUserId,
    assignedAdvisorId: lead.assignedAdvisorId,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export const leadRouter = router({
  create: publicProcedure
    .use(rateLimit({ scope: "lead:create", by: "ip" }))
    .input(createLeadInputSchema)
    .mutation(async ({ ctx, input }) => {
      const buyerUserId =
        ctx.session?.user.role === UserRole.BUYER
          ? ctx.session.user.id
          : null;

      const lead = await ctx.db.$transaction(async (tx) => {
        if (input.societyIds.length === 0 && input.source !== LeadSource.SUPPORT) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "At least one society is required.",
          });
        }

        const created = await tx.lead.create({
          data: {
            name: input.name,
            phone: input.phone,
            email: input.email ?? null,
            societyIds: input.societyIds,
            categoryId: input.categoryId ?? null,
            budgetPkr: input.budgetPkr ?? null,
            paymentPlanPreference: input.paymentPlanPreference ?? null,
            source: input.source,
            status: LeadStatus.NEW,
            buyerUserId: buyerUserId ?? null,
          },
        });

        const event = createLedgerEvent({
          id: toId(ctx.generateId()),
          type: LedgerEventType.LEAD_CREATED,
          entityId: toId(created.id),
          payload: {
            source: input.source,
            societyIds: input.societyIds,
          },
          actor: buyerUserId
            ? { actorId: buyerUserId, actorRole: UserRole.BUYER }
            : {},
          createdAt: ctx.now().toISOString(),
        });
        await persistLedgerEvent(tx, event);
        return created;
      });

      return toLeadDto(lead);
    }),

  list: opsProcedure.query(async ({ ctx }) => {
    const leads = await ctx.db.lead.findMany({
      orderBy: { createdAt: "desc" },
    });
    return leads.map(toLeadDto);
  }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    const leads = await ctx.db.lead.findMany({
      where: { buyerUserId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return leads.map(toLeadDto);
  }),

  getById: opsProcedure
    .input(z.object({ leadId: idSchema }))
    .query(async ({ ctx, input }) => {
      const lead = await ctx.db.lead.findUnique({
        where: { id: input.leadId },
      });
      if (lead === null) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      }
      return toLeadDto(lead);
    }),

  assignAdvisor: opsProcedure
    .input(z.object({ leadId: idSchema, advisorId: idSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      const advisorId = input.advisorId ?? ctx.session.user.id;
      const lead = await ctx.db.lead.update({
        where: { id: input.leadId },
        data: {
          assignedAdvisorId: advisorId,
          status: LeadStatus.CONTACTED,
        },
      });
      return toLeadDto(lead);
    }),

  updateStatus: opsProcedure
    .input(
      z.object({
        leadId: idSchema,
        status: leadStatusSchema,
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.db.lead.update({
        where: { id: input.leadId },
        data: {
          status: input.status,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
      });
      return toLeadDto(lead);
    }),
});

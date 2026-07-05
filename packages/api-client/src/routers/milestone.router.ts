import {
  reorderByIdsInputSchema,
  societyMediaListInputSchema,
  societyMilestoneCreateInputSchema,
  societyMilestoneDeleteInputSchema,
  societyMilestoneUpdateInputSchema,
} from "@sectoria/types";
import { router, TRPCError } from "../trpc.js";
import { publicProcedure, societyAdminProcedure } from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";
import { assertPublishedSociety } from "../lib/assert-published-society.js";
import { toMilestoneDto } from "../lib/society-profile-dto.js";
import {
  applyReorder,
  findResourceSocietyId,
  loadOwnedSocietyResource,
} from "../lib/society-profile-helpers.js";

export const milestoneRouter = router({
  /** Public milestone roadmap for a society profile (chronological). */
  listForSociety: publicProcedure
    .input(societyMediaListInputSchema)
    .query(async ({ ctx, input }) => {
      await assertPublishedSociety(ctx.db, input.societyId);
      const rows = await ctx.db.societyMilestone.findMany({
        where: { societyId: input.societyId },
        orderBy: [{ occurredOn: "desc" }, { sortOrder: "asc" }],
      });
      return rows.map(toMilestoneDto);
    }),

  /** Society admin: all milestones regardless of publish status. */
  listForAdmin: societyAdminProcedure
    .input(societyMediaListInputSchema)
    .query(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const rows = await ctx.db.societyMilestone.findMany({
        where: { societyId: input.societyId },
        orderBy: [{ occurredOn: "desc" }, { sortOrder: "asc" }],
      });
      return rows.map(toMilestoneDto);
    }),

  create: societyAdminProcedure
    .input(societyMilestoneCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const created = await ctx.db.societyMilestone.create({
        data: {
          societyId: input.societyId,
          title: input.title,
          description: input.description ?? null,
          occurredOn: new Date(input.occurredOn),
          status: input.status ?? "COMPLETED",
          sortOrder: input.sortOrder ?? 0,
        },
      });
      return toMilestoneDto(created);
    }),

  update: societyAdminProcedure
    .input(societyMilestoneUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await loadOwnedSocietyResource(
        (id) => findResourceSocietyId(ctx.db.societyMilestone, id),
        input.milestoneId,
        ctx.session,
        "Milestone",
      );
      const updated = await ctx.db.societyMilestone.update({
        where: { id: input.milestoneId },
        data: {
          ...input.data,
          occurredOn:
            input.data.occurredOn !== undefined
              ? new Date(input.data.occurredOn)
              : undefined,
        },
      });
      return toMilestoneDto(updated);
    }),

  delete: societyAdminProcedure
    .input(societyMilestoneDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      await loadOwnedSocietyResource(
        (id) => findResourceSocietyId(ctx.db.societyMilestone, id),
        input.milestoneId,
        ctx.session,
        "Milestone",
      );
      await ctx.db.societyMilestone.delete({
        where: { id: input.milestoneId },
      });
      return { ok: true as const };
    }),

  reorder: societyAdminProcedure
    .input(reorderByIdsInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const existing = await ctx.db.societyMilestone.findMany({
        where: { societyId: input.societyId },
        select: { id: true },
      });
      const validIds = new Set(existing.map((row) => row.id));
      if (!input.orderedIds.every((id) => validIds.has(id))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "orderedIds must reference milestones belonging to this society.",
        });
      }
      await applyReorder(
        ctx.db,
        "societyMilestone",
        input.societyId,
        input.orderedIds,
      );
      return { ok: true as const };
    }),
});

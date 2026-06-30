import { z } from "zod";
import {
  idSchema,
  isoDateTimeSchema,
  societyUpdateCategorySchema,
} from "@sectoria/types";
import { router, TRPCError } from "../trpc.js";
import { publicProcedure, societyAdminProcedure } from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";

function toUpdateDto<T extends Record<string, unknown>>(update: T) {
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

export const societyUpdateRouter = router({
  /** Public timeline of published updates for a society profile. */
  listForSociety: publicProcedure
    .input(z.object({ societyId: idSchema }))
    .query(async ({ ctx, input }) => {
      const updates = await ctx.db.societyUpdate.findMany({
        where: { societyId: input.societyId, isPublished: true },
        orderBy: { publishedAt: "desc" },
      });
      return updates.map(toUpdateDto);
    }),

  /** Society admin: list all updates including drafts. */
  listForAdmin: societyAdminProcedure
    .input(z.object({ societyId: idSchema }))
    .query(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const updates = await ctx.db.societyUpdate.findMany({
        where: { societyId: input.societyId },
        orderBy: { publishedAt: "desc" },
      });
      return updates.map(toUpdateDto);
    }),

  create: societyAdminProcedure
    .input(
      z.object({
        societyId: idSchema,
        title: z.string().min(1),
        body: z.string().min(1),
        category: societyUpdateCategorySchema,
        publishedAt: isoDateTimeSchema.optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const created = await ctx.db.societyUpdate.create({
        data: {
          societyId: input.societyId,
          title: input.title,
          body: input.body,
          category: input.category,
          publishedAt: input.publishedAt
            ? new Date(input.publishedAt)
            : new Date(),
          isPublished: input.isPublished ?? true,
        },
      });
      return toUpdateDto(created);
    }),

  update: societyAdminProcedure
    .input(
      z.object({
        updateId: idSchema,
        data: z.object({
          title: z.string().min(1).optional(),
          body: z.string().min(1).optional(),
          category: societyUpdateCategorySchema.optional(),
          publishedAt: isoDateTimeSchema.optional(),
          isPublished: z.boolean().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.societyUpdate.findUnique({
        where: { id: input.updateId },
        select: { societyId: true },
      });
      if (existing === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Society update not found.",
        });
      }
      assertSocietyOwnership(ctx.session, existing.societyId);

      const updated = await ctx.db.societyUpdate.update({
        where: { id: input.updateId },
        data: {
          ...input.data,
          publishedAt:
            input.data.publishedAt !== undefined
              ? new Date(input.data.publishedAt)
              : undefined,
        },
      });
      return toUpdateDto(updated);
    }),

  delete: societyAdminProcedure
    .input(z.object({ updateId: idSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.societyUpdate.findUnique({
        where: { id: input.updateId },
        select: { societyId: true },
      });
      if (existing === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Society update not found.",
        });
      }
      assertSocietyOwnership(ctx.session, existing.societyId);
      await ctx.db.societyUpdate.delete({ where: { id: input.updateId } });
      return { ok: true as const };
    }),
});

import {
  reorderByIdsInputSchema,
  societyMediaCreateInputSchema,
  societyMediaDeleteInputSchema,
  societyMediaListInputSchema,
  societyMediaUpdateInputSchema,
} from "@sectoria/types";
import { router, TRPCError } from "../trpc.js";
import { publicProcedure, societyAdminProcedure } from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";
import {
  toMediaAdminDto,
  toMediaPublicDto,
} from "../lib/society-profile-dto.js";
import { assertPublishedSociety } from "../lib/assert-published-society.js";
import {
  applyReorder,
  findResourceSocietyId,
  loadOwnedSocietyResource,
} from "../lib/society-profile-helpers.js";

export const mediaRouter = router({
  /** Public gallery/hero/progress media for a society profile. */
  listForSociety: publicProcedure
    .input(societyMediaListInputSchema)
    .query(async ({ ctx, input }) => {
      await assertPublishedSociety(ctx.db, input.societyId);
      const rows = await ctx.db.societyMedia.findMany({
        where: { societyId: input.societyId },
        orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
      });
      return rows.map(toMediaPublicDto);
    }),

  /** Society admin: all media including drafts/unpublished ordering. */
  listForAdmin: societyAdminProcedure
    .input(societyMediaListInputSchema)
    .query(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const rows = await ctx.db.societyMedia.findMany({
        where: { societyId: input.societyId },
        orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
      });
      return rows.map(toMediaAdminDto);
    }),

  create: societyAdminProcedure
    .input(societyMediaCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const created = await ctx.db.societyMedia.create({
        data: {
          societyId: input.societyId,
          kind: input.kind,
          storageKey: input.storageKey,
          alt: input.alt,
          caption: input.caption ?? null,
          capturedAt:
            input.capturedAt !== undefined && input.capturedAt !== null
              ? new Date(input.capturedAt)
              : null,
          sortOrder: input.sortOrder ?? 0,
          width: input.width ?? null,
          height: input.height ?? null,
        },
      });
      return toMediaAdminDto(created);
    }),

  update: societyAdminProcedure
    .input(societyMediaUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await loadOwnedSocietyResource(
        (id) => findResourceSocietyId(ctx.db.societyMedia, id),
        input.mediaId,
        ctx.session,
        "Media item",
      );
      const updated = await ctx.db.societyMedia.update({
        where: { id: input.mediaId },
        data: {
          ...input.data,
          capturedAt:
            input.data.capturedAt !== undefined
              ? input.data.capturedAt === null
                ? null
                : new Date(input.data.capturedAt)
              : undefined,
        },
      });
      return toMediaAdminDto(updated);
    }),

  delete: societyAdminProcedure
    .input(societyMediaDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      await loadOwnedSocietyResource(
        (id) => findResourceSocietyId(ctx.db.societyMedia, id),
        input.mediaId,
        ctx.session,
        "Media item",
      );
      await ctx.db.societyMedia.delete({ where: { id: input.mediaId } });
      return { ok: true as const };
    }),

  reorder: societyAdminProcedure
    .input(reorderByIdsInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const existing = await ctx.db.societyMedia.findMany({
        where: { societyId: input.societyId },
        select: { id: true },
      });
      const validIds = new Set(existing.map((row) => row.id));
      if (!input.orderedIds.every((id) => validIds.has(id))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "orderedIds must reference media belonging to this society.",
        });
      }
      await applyReorder(
        ctx.db,
        "societyMedia",
        input.societyId,
        input.orderedIds,
      );
      return { ok: true as const };
    }),
});

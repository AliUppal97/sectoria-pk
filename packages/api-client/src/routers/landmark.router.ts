import {
  nearbyLandmarkCreateInputSchema,
  nearbyLandmarkDeleteInputSchema,
  nearbyLandmarkUpdateInputSchema,
  reorderByIdsInputSchema,
  societyMediaListInputSchema,
} from "@sectoria/types";
import { router, TRPCError } from "../trpc.js";
import { publicProcedure, societyAdminProcedure } from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";
import { assertPublishedSociety } from "../lib/assert-published-society.js";
import { toLandmarkDto } from "../lib/society-profile-dto.js";
import {
  applyReorder,
  findResourceSocietyId,
  loadOwnedSocietyResource,
} from "../lib/society-profile-helpers.js";

export const landmarkRouter = router({
  /** Public connectivity landmarks for a society profile. */
  listForSociety: publicProcedure
    .input(societyMediaListInputSchema)
    .query(async ({ ctx, input }) => {
      await assertPublishedSociety(ctx.db, input.societyId);
      const rows = await ctx.db.nearbyLandmark.findMany({
        where: { societyId: input.societyId },
        orderBy: { sortOrder: "asc" },
      });
      return rows.map(toLandmarkDto);
    }),

  /** Society admin: all landmarks regardless of publish status. */
  listForAdmin: societyAdminProcedure
    .input(societyMediaListInputSchema)
    .query(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const rows = await ctx.db.nearbyLandmark.findMany({
        where: { societyId: input.societyId },
        orderBy: { sortOrder: "asc" },
      });
      return rows.map(toLandmarkDto);
    }),

  create: societyAdminProcedure
    .input(nearbyLandmarkCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const created = await ctx.db.nearbyLandmark.create({
        data: {
          societyId: input.societyId,
          name: input.name,
          category: input.category,
          distanceKm: input.distanceKm ?? null,
          driveTimeMins: input.driveTimeMins ?? null,
          sortOrder: input.sortOrder ?? 0,
        },
      });
      return toLandmarkDto(created);
    }),

  update: societyAdminProcedure
    .input(nearbyLandmarkUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await loadOwnedSocietyResource(
        (id) => findResourceSocietyId(ctx.db.nearbyLandmark, id),
        input.landmarkId,
        ctx.session,
        "Landmark",
      );
      const updated = await ctx.db.nearbyLandmark.update({
        where: { id: input.landmarkId },
        data: input.data,
      });
      return toLandmarkDto(updated);
    }),

  delete: societyAdminProcedure
    .input(nearbyLandmarkDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      await loadOwnedSocietyResource(
        (id) => findResourceSocietyId(ctx.db.nearbyLandmark, id),
        input.landmarkId,
        ctx.session,
        "Landmark",
      );
      await ctx.db.nearbyLandmark.delete({ where: { id: input.landmarkId } });
      return { ok: true as const };
    }),

  reorder: societyAdminProcedure
    .input(reorderByIdsInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const existing = await ctx.db.nearbyLandmark.findMany({
        where: { societyId: input.societyId },
        select: { id: true },
      });
      const validIds = new Set(existing.map((row) => row.id));
      if (!input.orderedIds.every((id) => validIds.has(id))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "orderedIds must reference landmarks belonging to this society.",
        });
      }
      await applyReorder(
        ctx.db,
        "nearbyLandmark",
        input.societyId,
        input.orderedIds,
      );
      return { ok: true as const };
    }),
});

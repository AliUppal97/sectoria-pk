import {
  amenityFeatureCreateInputSchema,
  amenityFeatureDeleteInputSchema,
  amenityFeatureUpdateInputSchema,
  reorderByIdsInputSchema,
  societyHighlightCreateInputSchema,
  societyHighlightDeleteInputSchema,
  societyHighlightUpdateInputSchema,
  societyMediaListInputSchema,
} from "@sectoria/types";
import { router, TRPCError } from "../trpc.js";
import { publicProcedure, societyAdminProcedure } from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";
import {
  toAmenityDto,
  toHighlightDto,
} from "../lib/society-profile-dto.js";
import {
  applyReorder,
  findResourceSocietyId,
  loadOwnedSocietyResource,
} from "../lib/society-profile-helpers.js";

export const societyFeatureRouter = router({
  /** Public rich amenity cards for a society profile. */
  listAmenitiesForSociety: publicProcedure
    .input(societyMediaListInputSchema)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.amenityFeature.findMany({
        where: { societyId: input.societyId },
        orderBy: { sortOrder: "asc" },
      });
      return rows.map(toAmenityDto);
    }),

  /** Public stat highlights for a society profile. */
  listHighlightsForSociety: publicProcedure
    .input(societyMediaListInputSchema)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.societyHighlight.findMany({
        where: { societyId: input.societyId },
        orderBy: { sortOrder: "asc" },
      });
      return rows.map(toHighlightDto);
    }),

  createAmenity: societyAdminProcedure
    .input(amenityFeatureCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const created = await ctx.db.amenityFeature.create({
        data: {
          societyId: input.societyId,
          title: input.title,
          description: input.description,
          icon: input.icon ?? null,
          imageKey: input.imageKey ?? null,
          sortOrder: input.sortOrder ?? 0,
        },
      });
      return toAmenityDto(created);
    }),

  updateAmenity: societyAdminProcedure
    .input(amenityFeatureUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await loadOwnedSocietyResource(
        (id) => findResourceSocietyId(ctx.db.amenityFeature, id),
        input.amenityId,
        ctx.session,
        "Amenity",
      );
      const updated = await ctx.db.amenityFeature.update({
        where: { id: input.amenityId },
        data: input.data,
      });
      return toAmenityDto(updated);
    }),

  deleteAmenity: societyAdminProcedure
    .input(amenityFeatureDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      await loadOwnedSocietyResource(
        (id) => findResourceSocietyId(ctx.db.amenityFeature, id),
        input.amenityId,
        ctx.session,
        "Amenity",
      );
      await ctx.db.amenityFeature.delete({ where: { id: input.amenityId } });
      return { ok: true as const };
    }),

  reorderAmenities: societyAdminProcedure
    .input(reorderByIdsInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const existing = await ctx.db.amenityFeature.findMany({
        where: { societyId: input.societyId },
        select: { id: true },
      });
      const validIds = new Set(existing.map((row) => row.id));
      if (!input.orderedIds.every((id) => validIds.has(id))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "orderedIds must reference amenities belonging to this society.",
        });
      }
      await applyReorder(
        ctx.db,
        "amenityFeature",
        input.societyId,
        input.orderedIds,
      );
      return { ok: true as const };
    }),

  createHighlight: societyAdminProcedure
    .input(societyHighlightCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const created = await ctx.db.societyHighlight.create({
        data: {
          societyId: input.societyId,
          label: input.label,
          value: input.value,
          icon: input.icon ?? null,
          sortOrder: input.sortOrder ?? 0,
        },
      });
      return toHighlightDto(created);
    }),

  updateHighlight: societyAdminProcedure
    .input(societyHighlightUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await loadOwnedSocietyResource(
        (id) => findResourceSocietyId(ctx.db.societyHighlight, id),
        input.highlightId,
        ctx.session,
        "Highlight",
      );
      const updated = await ctx.db.societyHighlight.update({
        where: { id: input.highlightId },
        data: input.data,
      });
      return toHighlightDto(updated);
    }),

  deleteHighlight: societyAdminProcedure
    .input(societyHighlightDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      await loadOwnedSocietyResource(
        (id) => findResourceSocietyId(ctx.db.societyHighlight, id),
        input.highlightId,
        ctx.session,
        "Highlight",
      );
      await ctx.db.societyHighlight.delete({
        where: { id: input.highlightId },
      });
      return { ok: true as const };
    }),

  reorderHighlights: societyAdminProcedure
    .input(reorderByIdsInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const existing = await ctx.db.societyHighlight.findMany({
        where: { societyId: input.societyId },
        select: { id: true },
      });
      const validIds = new Set(existing.map((row) => row.id));
      if (!input.orderedIds.every((id) => validIds.has(id))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "orderedIds must reference highlights belonging to this society.",
        });
      }
      await applyReorder(
        ctx.db,
        "societyHighlight",
        input.societyId,
        input.orderedIds,
      );
      return { ok: true as const };
    }),
});

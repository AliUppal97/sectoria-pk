import { z } from "zod";
import {
  idSchema,
  latitudeSchema,
  longitudeSchema,
  slugSchema,
  verificationTierSchema,
} from "@sectoria/types";
import { router, TRPCError } from "../trpc.js";
import { publicProcedure, societyAdminProcedure } from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";

/**
 * Society procedures. Reads are public (the marketplace must be crawlable); the
 * single mutation is gated on the caller being the administrator of *that*
 * society — a role check alone is not enough (see `auth-and-access-control.mdc`).
 */
export const societyRouter = router({
  /** Public directory listing with optional city / tier / authority filters. */
  list: publicProcedure
    .input(
      z
        .object({
          citySlug: slugSchema.optional(),
          verificationTier: verificationTierSchema.optional(),
          authority: z.string().min(1).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.society.findMany({
        where: {
          ...(input?.citySlug !== undefined
            ? { citySlug: input.citySlug }
            : {}),
          ...(input?.verificationTier !== undefined
            ? { verificationTier: input.verificationTier }
            : {}),
          ...(input?.authority !== undefined
            ? { authority: input.authority }
            : {}),
        },
        orderBy: { name: "asc" },
      });
    }),

  /** Public society profile by slug, including its inventory categories. */
  getBySlug: publicProcedure
    .input(z.object({ slug: slugSchema }))
    .query(async ({ ctx, input }) => {
      const society = await ctx.db.society.findUnique({
        where: { slug: input.slug },
        include: { categories: true },
      });
      if (society === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Society not found.",
        });
      }
      return society;
    }),

  /** Updates editable profile fields. Restricted to the owning administrator. */
  update: societyAdminProcedure
    .input(
      z.object({
        societyId: idSchema,
        data: z.object({
          description: z.string().min(1).optional(),
          amenities: z.array(z.string().min(1)).optional(),
          developmentStage: z.string().min(1).optional(),
          developmentPct: z.number().int().min(0).max(100).optional(),
          heroImageUrl: z.string().url().nullable().optional(),
          latitude: latitudeSchema.nullable().optional(),
          longitude: longitudeSchema.nullable().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const society = await ctx.db.society.findUnique({
        where: { id: input.societyId },
        select: { id: true },
      });
      if (society === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Society not found.",
        });
      }
      assertSocietyOwnership(ctx.session, society.id);

      return ctx.db.society.update({
        where: { id: society.id },
        data: input.data,
      });
    }),
});

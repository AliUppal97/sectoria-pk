import {
  developerCreateInputSchema,
  developerGetBySlugInputSchema,
  developerProjectCreateInputSchema,
  developerProjectDeleteInputSchema,
  developerProjectUpdateInputSchema,
  developerUpdateInputSchema,
} from "@sectoria/types";
import { router, TRPCError } from "../trpc.js";
import { publicProcedure, superAdminProcedure } from "../procedures.js";
import {
  toDeveloperDto,
  toDeveloperProjectDto,
} from "../lib/society-profile-dto.js";

export const developerRouter = router({
  /** Public developer directory (platform-curated trust data). */
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.developer.findMany({
      orderBy: { name: "asc" },
    });
    return rows.map(toDeveloperDto);
  }),

  /** Public developer profile with track record and associated societies. */
  getBySlug: publicProcedure
    .input(developerGetBySlugInputSchema)
    .query(async ({ ctx, input }) => {
      const developer = await ctx.db.developer.findUnique({
        where: { slug: input.slug },
        include: {
          projects: { orderBy: { sortOrder: "asc" } },
          societies: {
            where: { publishStatus: "PUBLISHED" },
            select: {
              id: true,
              slug: true,
              name: true,
              city: true,
              citySlug: true,
              verificationTier: true,
            },
          },
        },
      });
      if (developer === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Developer not found.",
        });
      }
      const { projects, societies, ...rest } = developer;
      return {
        ...toDeveloperDto(rest),
        projects: projects.map(toDeveloperProjectDto),
        societies,
      };
    }),

  create: superAdminProcedure
    .input(developerCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const created = await ctx.db.developer.create({
        data: {
          slug: input.slug,
          name: input.name,
          description: input.description,
          logoKey: input.logoKey ?? null,
          websiteUrl: input.websiteUrl ?? null,
          foundedYear: input.foundedYear ?? null,
        },
      });
      return toDeveloperDto(created);
    }),

  update: superAdminProcedure
    .input(developerUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.developer.findUnique({
        where: { id: input.developerId },
      });
      if (existing === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Developer not found.",
        });
      }
      const updated = await ctx.db.developer.update({
        where: { id: input.developerId },
        data: input.data,
      });
      return toDeveloperDto(updated);
    }),

  createProject: superAdminProcedure
    .input(developerProjectCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const developer = await ctx.db.developer.findUnique({
        where: { id: input.developerId },
      });
      if (developer === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Developer not found.",
        });
      }
      const created = await ctx.db.developerProject.create({
        data: {
          developerId: input.developerId,
          name: input.name,
          description: input.description ?? null,
          imageKey: input.imageKey ?? null,
          year: input.year ?? null,
          city: input.city ?? null,
          sortOrder: input.sortOrder ?? 0,
        },
      });
      return toDeveloperProjectDto(created);
    }),

  updateProject: superAdminProcedure
    .input(developerProjectUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.developerProject.findUnique({
        where: { id: input.projectId },
      });
      if (existing === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Developer project not found.",
        });
      }
      const updated = await ctx.db.developerProject.update({
        where: { id: input.projectId },
        data: input.data,
      });
      return toDeveloperProjectDto(updated);
    }),

  deleteProject: superAdminProcedure
    .input(developerProjectDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.developerProject.findUnique({
        where: { id: input.projectId },
      });
      if (existing === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Developer project not found.",
        });
      }
      await ctx.db.developerProject.delete({ where: { id: input.projectId } });
      return { ok: true as const };
    }),
});

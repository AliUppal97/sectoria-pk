import {
  articleCreateInputSchema,
  articleDeleteInputSchema,
  articleGetBySlugInputSchema,
  articleListInputSchema,
  articleUpdateInputSchema,
} from "@sectoria/types";
import { router, TRPCError } from "../trpc.js";
import { publicProcedure, superAdminProcedure } from "../procedures.js";
import { toArticleDto } from "../lib/society-profile-dto.js";

export const articleRouter = router({
  /** Super-admin: all articles including drafts for the authoring console. */
  listForAdmin: superAdminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.article.findMany({
      orderBy: [{ createdAt: "desc" }],
    });
    return rows.map(toArticleDto);
  }),

  /** Public blog index — published articles only. */
  list: publicProcedure
    .input(articleListInputSchema)
    .query(async ({ ctx, input }) => {
      const where: {
        isPublished: true;
        societyId?: string;
        developerId?: string;
      } = { isPublished: true };
      if (input.societyId !== undefined) where.societyId = input.societyId;
      if (input.developerId !== undefined) where.developerId = input.developerId;

      const rows = await ctx.db.article.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: input.limit,
      });
      return rows.map(toArticleDto);
    }),

  /** Public article page — unpublished articles return NOT_FOUND. */
  getBySlug: publicProcedure
    .input(articleGetBySlugInputSchema)
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.article.findUnique({
        where: { slug: input.slug },
      });
      if (row === null || !row.isPublished) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Article not found.",
        });
      }
      return toArticleDto(row);
    }),

  create: superAdminProcedure
    .input(articleCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const created = await ctx.db.article.create({
        data: {
          slug: input.slug,
          title: input.title,
          excerpt: input.excerpt,
          body: input.body,
          coverKey: input.coverKey ?? null,
          authorName: input.authorName,
          publishedAt:
            input.publishedAt !== undefined && input.publishedAt !== null
              ? new Date(input.publishedAt)
              : null,
          isPublished: input.isPublished ?? false,
          societyId: input.societyId ?? null,
          developerId: input.developerId ?? null,
        },
      });
      return toArticleDto(created);
    }),

  update: superAdminProcedure
    .input(articleUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.article.findUnique({
        where: { id: input.articleId },
      });
      if (existing === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Article not found.",
        });
      }
      const updated = await ctx.db.article.update({
        where: { id: input.articleId },
        data: {
          ...input.data,
          publishedAt:
            input.data.publishedAt !== undefined
              ? input.data.publishedAt === null
                ? null
                : new Date(input.data.publishedAt)
              : undefined,
        },
      });
      return toArticleDto(updated);
    }),

  delete: superAdminProcedure
    .input(articleDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.article.findUnique({
        where: { id: input.articleId },
      });
      if (existing === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Article not found.",
        });
      }
      await ctx.db.article.delete({ where: { id: input.articleId } });
      return { ok: true as const };
    }),
});

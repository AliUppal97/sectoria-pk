import {
  societyDocumentCreateInputSchema,
  societyDocumentDeleteInputSchema,
  societyDocumentListInputSchema,
  societyDocumentUpdateInputSchema,
} from "@sectoria/types";
import { router } from "../trpc.js";
import { publicProcedure, societyAdminProcedure } from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";
import {
  toDocumentAdminDto,
  toDocumentPublicDto,
} from "../lib/society-profile-dto.js";
import { assertPublishedSociety } from "../lib/assert-published-society.js";
import { findResourceSocietyId, loadOwnedSocietyResource } from "../lib/society-profile-helpers.js";

export const documentRouter = router({
  /**
   * Public downloadable documents for a society profile.
   * Returns only `isPublic` docs with short-lived signed URLs — private docs
   * (LOP/NOC) are excluded until an authenticated admin requests them.
   */
  listForSociety: publicProcedure
    .input(societyDocumentListInputSchema)
    .query(async ({ ctx, input }) => {
      await assertPublishedSociety(ctx.db, input.societyId);
      const rows = await ctx.db.societyDocument.findMany({
        where: { societyId: input.societyId, isPublic: true },
        orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
      });
      return rows.map(toDocumentPublicDto);
    }),

  /** Society admin: all documents including private compliance artifacts. */
  listForAdmin: societyAdminProcedure
    .input(societyDocumentListInputSchema)
    .query(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const rows = await ctx.db.societyDocument.findMany({
        where: { societyId: input.societyId },
        orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
      });
      return rows.map((row) => toDocumentAdminDto(row, { includeUrl: true }));
    }),

  create: societyAdminProcedure
    .input(societyDocumentCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      const created = await ctx.db.societyDocument.create({
        data: {
          societyId: input.societyId,
          kind: input.kind,
          title: input.title,
          storageKey: input.storageKey,
          fileSize: input.fileSize,
          contentType: input.contentType,
          isPublic: input.isPublic ?? true,
          sortOrder: input.sortOrder ?? 0,
        },
      });
      return toDocumentAdminDto(created);
    }),

  update: societyAdminProcedure
    .input(societyDocumentUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      await loadOwnedSocietyResource(
        (id) => findResourceSocietyId(ctx.db.societyDocument, id),
        input.documentId,
        ctx.session,
        "Document",
      );
      const updated = await ctx.db.societyDocument.update({
        where: { id: input.documentId },
        data: input.data,
      });
      return toDocumentAdminDto(updated);
    }),

  delete: societyAdminProcedure
    .input(societyDocumentDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      await loadOwnedSocietyResource(
        (id) => findResourceSocietyId(ctx.db.societyDocument, id),
        input.documentId,
        ctx.session,
        "Document",
      );
      await ctx.db.societyDocument.delete({ where: { id: input.documentId } });
      return { ok: true as const };
    }),
});

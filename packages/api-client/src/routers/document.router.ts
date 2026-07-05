import {
  societyDocumentCreateInputSchema,
  societyDocumentDeleteInputSchema,
  documentGetDownloadUrlInputSchema,
  societyDocumentListInputSchema,
  societyDocumentUpdateInputSchema,
} from "@sectoria/types";
import { router, TRPCError } from "../trpc.js";
import { publicProcedure, societyAdminProcedure } from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";
import {
  toDocumentAdminDto,
  toDocumentPublicDto,
} from "../lib/society-profile-dto.js";
import { assertPublishedSociety } from "../lib/assert-published-society.js";
import { findResourceSocietyId, loadOwnedSocietyResource } from "../lib/society-profile-helpers.js";
import { DEFAULT_SIGNED_URL_TTL_SECONDS } from "@sectoria/storage";

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
      return Promise.all(
        rows.map((row) => toDocumentPublicDto(row, ctx.storage)),
      );
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
      return Promise.all(
        rows.map((row) =>
          toDocumentAdminDto(row, ctx.storage, { includeUrl: true }),
        ),
      );
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
      return toDocumentAdminDto(created, ctx.storage);
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
      return toDocumentAdminDto(updated, ctx.storage);
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

  /**
   * Society admin: mint a short-lived signed URL for a document (required for
   * private LOP/NOC before download).
   */
  getDownloadUrl: societyAdminProcedure
    .input(documentGetDownloadUrlInputSchema)
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.societyDocument.findUnique({
        where: { id: input.documentId },
        select: {
          id: true,
          societyId: true,
          storageKey: true,
          isPublic: true,
        },
      });
      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });
      }
      assertSocietyOwnership(ctx.session, doc.societyId);

      const url = await ctx.storage.getSignedDownloadUrl({
        key: doc.storageKey,
        ttlSeconds: DEFAULT_SIGNED_URL_TTL_SECONDS,
        bucket: doc.isPublic ? "public" : "private",
      });

      return {
        url,
        expiresInSeconds: DEFAULT_SIGNED_URL_TTL_SECONDS,
      };
    }),
});

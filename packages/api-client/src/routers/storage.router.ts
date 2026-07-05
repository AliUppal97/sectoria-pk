import { storageRequestUploadInputSchema } from "@sectoria/types";
import {
  assertAllowedContentType,
  assertAllowedFileSize,
  buildStorageKey,
  InvalidUploadError,
  type StorageAdapter,
} from "@sectoria/storage";
import { TRPCError } from "../trpc.js";
import { societyAdminProcedure } from "../procedures.js";
import { assertSocietyOwnership } from "../middleware/require-society-ownership.js";
import { router } from "../trpc.js";

function mapInvalidUploadError(error: unknown): never {
  if (error instanceof InvalidUploadError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
      cause: error,
    });
  }
  throw error;
}

export const storageRouter = router({
  /**
   * Society admin: mint a presigned PUT after validating content-type allow-list
   * and size cap. Client uploads directly; server stores the returned storageKey.
   */
  requestUploadUrl: societyAdminProcedure
    .input(storageRequestUploadInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertSocietyOwnership(ctx.session, input.societyId);
      try {
        assertAllowedContentType(input.contentType);
        assertAllowedFileSize(input.fileSize);
      } catch (error) {
        mapInvalidUploadError(error);
      }

      const objectId = ctx.generateId();
      const storageKey = buildStorageKey({
        societyId: input.societyId,
        area: input.resourceType === "media" ? "media" : "documents",
        objectId,
        contentType: input.contentType,
      });

      const bucket = input.visibility === "public" ? "public" : "private";
      const { url, expiresAt } = await ctx.storage.getUploadUrl({
        key: storageKey,
        contentType: input.contentType,
        bucket,
      });

      return {
        uploadUrl: url,
        storageKey,
        expiresAt: expiresAt.toISOString(),
      };
    }),
});

/** Maps upload validation failures to typed tRPC errors (for unit tests). */
export function validateUploadRequest(
  contentType: string,
  fileSize: number,
): void {
  try {
    assertAllowedContentType(contentType);
    assertAllowedFileSize(fileSize);
  } catch (error) {
    mapInvalidUploadError(error);
  }
}

/** Resolves a public media URL via the injected storage adapter. */
export function resolvePublicMediaUrl(
  storage: StorageAdapter,
  storageKey: string,
): string {
  return storage.getPublicUrl(storageKey);
}

/** Mints a signed document download URL via the injected storage adapter. */
export async function resolveSignedDocumentUrl(
  storage: StorageAdapter,
  options: {
    storageKey: string;
    isPublic: boolean;
    ttlSeconds?: number;
  },
): Promise<string> {
  return storage.getSignedDownloadUrl({
    key: options.storageKey,
    ttlSeconds: options.ttlSeconds ?? 300,
    bucket: options.isPublic ? "public" : "private",
  });
}

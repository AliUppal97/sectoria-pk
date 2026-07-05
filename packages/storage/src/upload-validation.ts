import {
  SOCIETY_DOCUMENT_MAX_BYTES,
  societyDocumentContentTypeSchema,
} from "@sectoria/types";
import { InvalidUploadError } from "./errors.js";

export {
  SOCIETY_DOCUMENT_MAX_BYTES,
  societyDocumentContentTypeSchema,
};

/** Validates upload content-type against the pdf/jpg/png allow-list. */
export function assertAllowedContentType(contentType: string): void {
  const result = societyDocumentContentTypeSchema.safeParse(contentType);
  if (!result.success) {
    throw new InvalidUploadError(
      "content_type",
      `Content type "${contentType}" is not allowed. Accepted: application/pdf, image/jpeg, image/png.`,
    );
  }
}

/** Validates declared file size against the platform cap. */
export function assertAllowedFileSize(fileSize: number): void {
  if (fileSize <= 0 || fileSize > SOCIETY_DOCUMENT_MAX_BYTES) {
    throw new InvalidUploadError(
      "file_size",
      `File size must be between 1 and ${String(SOCIETY_DOCUMENT_MAX_BYTES)} bytes.`,
    );
  }
}

/** Maps an allowed MIME type to a file extension (no PII in keys). */
export function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case "application/pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    default:
      throw new InvalidUploadError(
        "content_type",
        `Content type "${contentType}" is not allowed.`,
      );
  }
}

/** Builds a non-PII object key: societies/{societyId}/{area}/{id}.{ext}. */
export function buildStorageKey(options: {
  societyId: string;
  area: "media" | "documents";
  objectId: string;
  contentType: string;
}): string {
  const ext = extensionForContentType(options.contentType);
  return `societies/${options.societyId}/${options.area}/${options.objectId}.${ext}`;
}

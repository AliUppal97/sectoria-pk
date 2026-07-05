import type { SocietyDocumentContentType } from "@sectoria/types";
import { SOCIETY_DOCUMENT_MAX_BYTES } from "@sectoria/types";

const ALLOWED_TYPES = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

/** Validates a file before requesting a presigned upload URL. */
export function validateUploadFile(file: File): SocietyDocumentContentType {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Only PDF, JPEG, and PNG files are allowed.");
  }
  if (file.size <= 0 || file.size > SOCIETY_DOCUMENT_MAX_BYTES) {
    throw new Error("File must be between 1 byte and 10 MiB.");
  }
  return file.type as SocietyDocumentContentType;
}

interface UploadUrlResponse {
  uploadUrl: string;
  storageKey: string;
}

/**
 * Uploads a file via the presigned PUT flow (storage.md):
 * request URL → PUT to object storage → return storageKey for create mutation.
 */
export async function uploadViaPresignedUrl(options: {
  file: File;
  requestUploadUrl: (input: {
    societyId: string;
    contentType: SocietyDocumentContentType;
    fileSize: number;
    visibility: "public" | "private";
    resourceType: "media" | "document";
  }) => Promise<UploadUrlResponse>;
  societyId: string;
  visibility: "public" | "private";
  resourceType: "media" | "document";
}): Promise<{
  storageKey: string;
  contentType: SocietyDocumentContentType;
  fileSize: number;
}> {
  const contentType = validateUploadFile(options.file);
  const { uploadUrl, storageKey } = await options.requestUploadUrl({
    societyId: options.societyId,
    contentType,
    fileSize: options.file.size,
    visibility: options.visibility,
    resourceType: options.resourceType,
  });

  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: options.file,
    headers: { "Content-Type": contentType },
  });

  if (!response.ok) {
    throw new Error("Upload to storage failed. Please try again.");
  }

  return { storageKey, contentType, fileSize: options.file.size };
}

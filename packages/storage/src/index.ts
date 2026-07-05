/**
 * `@sectoria/storage` — S3-compatible object storage with a swappable local mock.
 *
 * Import everything from this barrel, not individual files.
 */

export type {
  StorageAdapter,
  StorageBucket,
  UploadUrlResult,
  GetUploadUrlParams,
  GetSignedDownloadUrlParams,
} from "./interface.js";

export {
  createStorageAdapter,
  type CreateStorageAdapterConfig,
} from "./factory.js";

export {
  resolveStorageMode,
  storageEnvSchema,
  type StorageEnv,
  type StorageMode,
  type ResolvedS3Credentials,
} from "./config.js";

export { LocalStorageAdapter } from "./local-adapter.js";
export {
  S3StorageAdapter,
  type S3StorageAdapterConfig,
} from "./s3-adapter.js";

export {
  DEFAULT_SIGNED_URL_TTL_SECONDS,
  DEFAULT_UPLOAD_URL_TTL_SECONDS,
  LOCAL_STORAGE_BASE_URL,
  parseSignedUrlExpiry,
  isSignedUrlExpired,
} from "./constants.js";

export {
  StorageConfigError,
  InvalidUploadError,
} from "./errors.js";

export {
  assertAllowedContentType,
  assertAllowedFileSize,
  buildStorageKey,
  extensionForContentType,
  SOCIETY_DOCUMENT_MAX_BYTES,
} from "./upload-validation.js";

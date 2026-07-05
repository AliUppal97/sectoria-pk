/** Which object-storage bucket to target for an upload or signed download. */
export type StorageBucket = "public" | "private";

/** Result of minting a presigned upload URL. */
export interface UploadUrlResult {
  readonly url: string;
  readonly expiresAt: Date;
}

/** Parameters for {@link StorageAdapter.getUploadUrl}. */
export interface GetUploadUrlParams {
  readonly key: string;
  readonly contentType: string;
  readonly bucket: StorageBucket;
}

/** Parameters for {@link StorageAdapter.getSignedDownloadUrl}. */
export interface GetSignedDownloadUrlParams {
  readonly key: string;
  readonly ttlSeconds: number;
  readonly bucket: StorageBucket;
}

/**
 * Thin port for S3-compatible object storage. Routers depend on this interface;
 * the factory selects a local mock (dev/CI) or a real S3/R2 client (prod).
 */
export interface StorageAdapter {
  /** Resolves a public-read object key to a stable CDN/public URL. */
  getPublicUrl(key: string): string;

  /** Mints a short-lived presigned PUT URL for direct client upload. */
  getUploadUrl(params: GetUploadUrlParams): Promise<UploadUrlResult>;

  /** Mints a short-lived signed GET URL for private or expiring downloads. */
  getSignedDownloadUrl(params: GetSignedDownloadUrlParams): Promise<string>;
}

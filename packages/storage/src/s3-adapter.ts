import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageAdapter } from "./interface.js";
import {
  DEFAULT_SIGNED_URL_TTL_SECONDS,
  DEFAULT_UPLOAD_URL_TTL_SECONDS,
} from "./constants.js";
import type {
  GetSignedDownloadUrlParams,
  GetUploadUrlParams,
} from "./interface.js";
import type { ResolvedS3Credentials } from "./config.js";
import { isAbsoluteHttpUrl, resolvePublicUrl } from "./resolve-public-url.js";

export type S3StorageAdapterConfig = ResolvedS3Credentials;

/**
 * S3-compatible adapter (AWS S3, Cloudflare R2, MinIO). Public media uses the
 * public bucket + CDN base URL; sensitive documents use the private bucket.
 */
export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly credentials: ResolvedS3Credentials;

  constructor(credentials: S3StorageAdapterConfig) {
    this.credentials = credentials;
    this.client = new S3Client({
      endpoint: credentials.endpoint,
      region: "auto",
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  getPublicUrl(key: string): string {
    return resolvePublicUrl(this.credentials.publicBaseUrl, key);
  }

  private resolveBucket(bucket: "public" | "private"): string {
    return bucket === "public"
      ? this.credentials.publicBucket
      : this.credentials.privateBucket;
  }

  async getUploadUrl(params: GetUploadUrlParams): Promise<{
    url: string;
    expiresAt: Date;
  }> {
    const expiresIn = DEFAULT_UPLOAD_URL_TTL_SECONDS;
    const command = new PutObjectCommand({
      Bucket: this.resolveBucket(params.bucket),
      Key: params.key,
      ContentType: params.contentType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    return { url, expiresAt };
  }

  async getSignedDownloadUrl(
    params: GetSignedDownloadUrlParams,
  ): Promise<string> {
    if (isAbsoluteHttpUrl(params.key)) return params.key;
    const expiresIn = params.ttlSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS;
    const command = new GetObjectCommand({
      Bucket: this.resolveBucket(params.bucket),
      Key: params.key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}

import type { StorageAdapter } from "./interface.js";
import { isAbsoluteHttpUrl, resolvePublicUrl } from "./resolve-public-url.js";
import {
  DEFAULT_SIGNED_URL_TTL_SECONDS,
  DEFAULT_UPLOAD_URL_TTL_SECONDS,
} from "./constants.js";
import type { GetSignedDownloadUrlParams, GetUploadUrlParams } from "./interface.js";

export interface LocalStorageAdapterOptions {
  readonly publicBaseUrl: string;
  readonly now?: () => Date;
}

/**
 * In-memory URL generator for dev/CI. Does not persist files — clients receive
 * deterministic presigned/signed URLs without cloud credentials.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly publicBaseUrl: string;
  private readonly now: () => Date;

  constructor(options: LocalStorageAdapterOptions) {
    this.publicBaseUrl = options.publicBaseUrl.replace(/\/$/, "");
    this.now = options.now ?? (() => new Date());
  }

  getPublicUrl(key: string): string {
    return resolvePublicUrl(this.publicBaseUrl, key);
  }

  async getUploadUrl(params: GetUploadUrlParams): Promise<{
    url: string;
    expiresAt: Date;
  }> {
    const expiresAt = new Date(
      this.now().getTime() + DEFAULT_UPLOAD_URL_TTL_SECONDS * 1000,
    );
    const url = new URL(`${this.publicBaseUrl}/upload/${params.key}`);
    url.searchParams.set("contentType", params.contentType);
    url.searchParams.set("bucket", params.bucket);
    url.searchParams.set("expires", String(expiresAt.getTime()));
    return { url: url.toString(), expiresAt };
  }

  async getSignedDownloadUrl(
    params: GetSignedDownloadUrlParams,
  ): Promise<string> {
    if (isAbsoluteHttpUrl(params.key)) return params.key;
    const ttl = params.ttlSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS;
    const expiresMs = this.now().getTime() + ttl * 1000;
    const url = new URL(`${this.publicBaseUrl}/signed/${params.key}`);
    url.searchParams.set("expires", String(expiresMs));
    url.searchParams.set("bucket", params.bucket);
    return url.toString();
  }
}

import { resolveStorageMode } from "./config.js";
import { LocalStorageAdapter } from "./local-adapter.js";
import { S3StorageAdapter } from "./s3-adapter.js";
import type { StorageAdapter } from "./interface.js";

export interface CreateStorageAdapterConfig {
  readonly env?: Record<string, string | undefined>;
  readonly now?: () => Date;
}

/**
 * Builds the storage adapter. Blank storage env (dev/test default) → local mock;
 * all S3 credentials present → real S3-compatible client.
 */
export function createStorageAdapter(
  config: CreateStorageAdapterConfig = {},
): StorageAdapter {
  const mode = resolveStorageMode(config.env);
  if (mode.mode === "s3") {
    return new S3StorageAdapter(mode.credentials);
  }
  return new LocalStorageAdapter({
    publicBaseUrl: mode.publicBaseUrl,
    now: config.now,
  });
}

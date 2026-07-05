import { z } from "zod";
import { StorageConfigError } from "./errors.js";

const credentialSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(1).optional(),
);

/** Environment variables read by {@link createStorageAdapter}. */
export const storageEnvSchema = z.object({
  STORAGE_ENDPOINT: credentialSchema,
  STORAGE_BUCKET: credentialSchema,
  STORAGE_BUCKET_PRIVATE: credentialSchema,
  STORAGE_ACCESS_KEY_ID: credentialSchema,
  STORAGE_SECRET_ACCESS_KEY: credentialSchema,
  STORAGE_PUBLIC_BASE_URL: credentialSchema,
});
export type StorageEnv = z.infer<typeof storageEnvSchema>;

export interface ResolvedS3Credentials {
  readonly endpoint: string;
  readonly publicBucket: string;
  readonly privateBucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly publicBaseUrl: string;
}

export type StorageMode =
  | { readonly mode: "local"; readonly publicBaseUrl: string }
  | { readonly mode: "s3"; readonly credentials: ResolvedS3Credentials };

const REQUIRED_S3_KEYS = [
  "STORAGE_ENDPOINT",
  "STORAGE_BUCKET",
  "STORAGE_BUCKET_PRIVATE",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
] as const satisfies readonly (keyof StorageEnv)[];

/**
 * Resolves local vs. S3 storage from environment. All S3 credentials must be
 * present for real storage; all blank → local mock. Partial config throws.
 */
export function resolveStorageMode(
  envSource: Record<string, string | undefined> = process.env,
): StorageMode {
  const parsed = storageEnvSchema.safeParse(envSource);
  if (!parsed.success) {
    throw new StorageConfigError(
      `Invalid storage environment: ${parsed.error.message}`,
    );
  }
  const env = parsed.data;

  const presentKeys = REQUIRED_S3_KEYS.filter((key) => env[key] !== undefined);
  const allPresent = presentKeys.length === REQUIRED_S3_KEYS.length;
  const nonePresent = presentKeys.length === 0;

  if (allPresent) {
    return {
      mode: "s3",
      credentials: {
        endpoint: env.STORAGE_ENDPOINT!,
        publicBucket: env.STORAGE_BUCKET!,
        privateBucket: env.STORAGE_BUCKET_PRIVATE!,
        accessKeyId: env.STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY!,
        publicBaseUrl:
          env.STORAGE_PUBLIC_BASE_URL ??
          `https://${env.STORAGE_BUCKET!}.storage.sectoria.pk`,
      },
    };
  }

  if (!nonePresent) {
    const missing = REQUIRED_S3_KEYS.filter((key) => env[key] === undefined);
    throw new StorageConfigError(
      `Partial storage configuration: set all of ${REQUIRED_S3_KEYS.join(", ")} or leave them all blank for the local adapter. Missing: ${missing.join(", ")}`,
    );
  }

  return {
    mode: "local",
    publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL ?? "http://127.0.0.1:3099",
  };
}

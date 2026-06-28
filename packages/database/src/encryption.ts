import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Field-level encryption for the only two PII fields that must never sit in the
 * database as plaintext: a buyer/dealer's CNIC (national identity number) and
 * NTN (FBR tax number). See `security.mdc` and `database.mdc` — every other
 * module reaches these values *only* through this helper; inline `crypto` calls
 * elsewhere are forbidden so the algorithm and key handling live in one place.
 *
 * Algorithm: AES-256-GCM. GCM is authenticated encryption — decryption fails
 * loudly if the ciphertext (or its associated metadata) has been tampered with,
 * rather than silently returning garbage. The 256-bit key comes from the
 * `ENCRYPTION_KEY` env var; key rotation is documented in ADR-005.
 *
 * Stored format (a single self-describing string, safe to put in a text column):
 *
 *   v1:<base64(iv ‖ authTag ‖ ciphertext)>
 *
 * The leading version tag is what makes rotation possible without a data
 * migration: a future `v2` (new key / new algorithm) can be decrypted by the
 * matching branch while old `v1` rows keep working until lazily re-encrypted.
 */

const ALGORITHM = "aes-256-gcm";
const KEY_BYTE_LENGTH = 32; // AES-256 → 256-bit key.
const IV_BYTE_LENGTH = 12; // 96-bit nonce is the GCM standard / most efficient.
const AUTH_TAG_BYTE_LENGTH = 16; // 128-bit GCM authentication tag.
const CURRENT_VERSION = "v1";
const VERSION_DELIMITER = ":";

/**
 * Thrown for any encryption/decryption failure: a missing or malformed
 * `ENCRYPTION_KEY`, an unparseable stored value, an unknown version tag, or a
 * failed authentication check (tampered ciphertext / wrong key). Never leaks the
 * plaintext, the key, or the raw ciphertext in its message — only what kind of
 * failure occurred — so it is safe to log per `security.mdc`.
 */
export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionError";
  }
}

/**
 * Resolves and validates the 256-bit key from `ENCRYPTION_KEY`.
 *
 * Read lazily (per call) rather than at module load so that importing this file
 * — e.g. for its types in a context where encryption is never invoked — does not
 * crash on a missing key, while any actual `encrypt`/`decrypt` still fails fast.
 * Accepts the key as base64 (preferred, e.g. `openssl rand -base64 32`) or as a
 * 64-character hex string; either must decode to exactly 32 bytes.
 *
 * @throws {EncryptionError} if the var is unset/blank or not exactly 32 bytes.
 */
function resolveKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (raw === undefined || raw.trim() === "") {
    throw new EncryptionError(
      "ENCRYPTION_KEY is not set. A 32-byte key (base64 or 64-char hex) is " +
        "required to encrypt or decrypt CNIC/NTN fields.",
    );
  }

  const trimmed = raw.trim();
  const isHex = /^[0-9a-fA-F]{64}$/.test(trimmed);
  const key = Buffer.from(trimmed, isHex ? "hex" : "base64");

  if (key.length !== KEY_BYTE_LENGTH) {
    throw new EncryptionError(
      `ENCRYPTION_KEY must decode to exactly ${KEY_BYTE_LENGTH} bytes, but ` +
        `decoded to ${key.length}. Generate one with \`openssl rand -base64 32\`.`,
    );
  }

  return key;
}

/**
 * Encrypts a plaintext string (a raw CNIC or NTN) for storage at rest.
 *
 * Each call generates a fresh random IV, so encrypting the same value twice
 * yields different ciphertexts — this prevents an observer from detecting that
 * two rows share a CNIC. The result is the versioned, self-describing string
 * documented above, suitable for a Prisma `String?` column such as
 * `User.cnicEncrypted` / `User.ntnEncrypted`.
 *
 * @param plaintext - The raw sensitive value. Must be a non-empty string.
 * @returns The `v1:<base64>` ciphertext token.
 * @throws {EncryptionError} if `plaintext` is empty or the key is invalid.
 */
export function encrypt(plaintext: string): string {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new EncryptionError("Cannot encrypt an empty or non-string value.");
  }

  const key = resolveKey();
  const iv = randomBytes(IV_BYTE_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const payload = Buffer.concat([iv, authTag, ciphertext]).toString("base64");
  return `${CURRENT_VERSION}${VERSION_DELIMITER}${payload}`;
}

/**
 * Decrypts a token produced by {@link encrypt} back to its original plaintext.
 *
 * GCM verifies the authentication tag as part of decryption: if the stored
 * value was altered, truncated, or was encrypted under a different key, this
 * throws rather than returning a corrupted string.
 *
 * @param token - A `v1:<base64>` value previously returned by {@link encrypt}.
 * @returns The original plaintext.
 * @throws {EncryptionError} if the token is malformed, uses an unknown version,
 *   or fails authentication (tampering / wrong key).
 */
export function decrypt(token: string): string {
  if (typeof token !== "string" || token.length === 0) {
    throw new EncryptionError("Cannot decrypt an empty or non-string value.");
  }

  const delimiterIndex = token.indexOf(VERSION_DELIMITER);
  if (delimiterIndex === -1) {
    throw new EncryptionError("Ciphertext is missing its version prefix.");
  }

  const version = token.slice(0, delimiterIndex);
  if (version !== CURRENT_VERSION) {
    throw new EncryptionError(`Unsupported ciphertext version: "${version}".`);
  }

  const decoded = Buffer.from(token.slice(delimiterIndex + 1), "base64");
  if (decoded.length <= IV_BYTE_LENGTH + AUTH_TAG_BYTE_LENGTH) {
    throw new EncryptionError("Ciphertext is too short to be valid.");
  }

  const iv = decoded.subarray(0, IV_BYTE_LENGTH);
  const authTag = decoded.subarray(
    IV_BYTE_LENGTH,
    IV_BYTE_LENGTH + AUTH_TAG_BYTE_LENGTH,
  );
  const ciphertext = decoded.subarray(IV_BYTE_LENGTH + AUTH_TAG_BYTE_LENGTH);

  const key = resolveKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // node throws a generic error on a failed GCM tag check; normalise it to our
    // typed error and deliberately do not surface the underlying detail.
    throw new EncryptionError(
      "Decryption failed: the value could not be authenticated (it may have " +
        "been tampered with or was encrypted under a different key).",
    );
  }
}

/**
 * Reports whether a stored value looks like a token this helper produced (has a
 * recognised version prefix). Useful at a migration/rotation boundary to tell an
 * already-encrypted value from a stray plaintext. Does **not** verify the key or
 * authenticity — only the envelope shape. Uses a constant-time compare on the
 * version tag to avoid leaking it through timing.
 */
export function isEncrypted(value: string): boolean {
  if (typeof value !== "string") return false;
  const prefix = `${CURRENT_VERSION}${VERSION_DELIMITER}`;
  if (value.length < prefix.length) return false;
  const candidate = Buffer.from(value.slice(0, prefix.length), "utf8");
  const expected = Buffer.from(prefix, "utf8");
  return (
    candidate.length === expected.length &&
    timingSafeEqual(candidate, expected)
  );
}

import { afterAll, beforeAll, describe, expect, it } from "vitest";

// A clearly-fake, test-only 32-byte key (base64). Set before the helper is
// exercised — resolveKey() reads the env lazily per call, so assigning here is
// enough. Never use a real production key in a committed test (see security.mdc).
const TEST_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

let originalKey: string | undefined;

beforeAll(() => {
  originalKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

afterAll(() => {
  if (originalKey === undefined) {
    delete process.env.ENCRYPTION_KEY;
  } else {
    process.env.ENCRYPTION_KEY = originalKey;
  }
});

const { encrypt, decrypt, isEncrypted, EncryptionError } = await import(
  "../encryption.js"
);

// Realistic-format but fake Pakistani identifiers.
const SAMPLE_CNIC = "35202-1234567-1";
const SAMPLE_NTN = "1234567-8";

describe("encrypt / decrypt round-trip", () => {
  it("decrypts back to the exact original plaintext", () => {
    expect(decrypt(encrypt(SAMPLE_CNIC))).toBe(SAMPLE_CNIC);
    expect(decrypt(encrypt(SAMPLE_NTN))).toBe(SAMPLE_NTN);
  });

  it("round-trips unicode (e.g. an Urdu name) without corruption", () => {
    const value = "محمد علی";
    expect(decrypt(encrypt(value))).toBe(value);
  });

  it("produces ciphertext that does not contain the plaintext", () => {
    const token = encrypt(SAMPLE_CNIC);
    expect(token).not.toContain(SAMPLE_CNIC);
  });

  it("emits a versioned token recognised by isEncrypted", () => {
    const token = encrypt(SAMPLE_CNIC);
    expect(token.startsWith("v1:")).toBe(true);
    expect(isEncrypted(token)).toBe(true);
  });

  it("uses a fresh IV so the same plaintext encrypts to different ciphertexts", () => {
    expect(encrypt(SAMPLE_CNIC)).not.toBe(encrypt(SAMPLE_CNIC));
    // ...but both still decrypt to the same value.
    expect(decrypt(encrypt(SAMPLE_CNIC))).toBe(
      decrypt(encrypt(SAMPLE_CNIC)),
    );
  });
});

describe("authentication (tamper detection)", () => {
  it("throws when the ciphertext body has been altered", () => {
    const token = encrypt(SAMPLE_CNIC);
    const [version, body] = token.split(":");
    // Decode, flip the final ciphertext byte, re-encode. Operating on raw bytes
    // (rather than a base64 character) guarantees the ciphertext actually
    // changes, regardless of base64 padding alignment.
    const bytes = Buffer.from(body!, "base64");
    const lastIndex = bytes.length - 1;
    bytes[lastIndex] = (bytes[lastIndex] ?? 0) ^ 0xff;
    const tampered = `${version}:${bytes.toString("base64")}`;

    expect(() => decrypt(tampered)).toThrow(EncryptionError);
  });

  it("throws when decrypting under a different key than it was encrypted with", () => {
    const token = encrypt(SAMPLE_CNIC);
    const previous = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY =
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBA=";
    try {
      expect(() => decrypt(token)).toThrow(EncryptionError);
    } finally {
      process.env.ENCRYPTION_KEY = previous;
    }
  });
});

describe("invalid input is rejected with a typed error", () => {
  it("throws when encrypting an empty string", () => {
    expect(() => encrypt("")).toThrow(EncryptionError);
  });

  it("throws when decrypting a value with no version prefix", () => {
    expect(() => decrypt("not-a-valid-token")).toThrow(EncryptionError);
  });

  it("throws on an unknown ciphertext version", () => {
    expect(() => decrypt("v2:abcdef")).toThrow(EncryptionError);
  });

  it("throws when the payload is too short to contain iv + tag", () => {
    expect(() => decrypt("v1:QUJD")).toThrow(EncryptionError);
  });
});

describe("key validation", () => {
  it("throws a typed error when ENCRYPTION_KEY is unset", () => {
    const previous = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    try {
      expect(() => encrypt(SAMPLE_CNIC)).toThrow(EncryptionError);
    } finally {
      process.env.ENCRYPTION_KEY = previous;
    }
  });

  it("throws when the key does not decode to 32 bytes", () => {
    const previous = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = "dG9vLXNob3J0"; // "too-short", < 32 bytes
    try {
      expect(() => encrypt(SAMPLE_CNIC)).toThrow(EncryptionError);
    } finally {
      process.env.ENCRYPTION_KEY = previous;
    }
  });
});

describe("isEncrypted", () => {
  it("returns false for a plaintext value", () => {
    expect(isEncrypted(SAMPLE_CNIC)).toBe(false);
  });

  it("returns true for a token produced by encrypt", () => {
    expect(isEncrypted(encrypt(SAMPLE_NTN))).toBe(true);
  });
});

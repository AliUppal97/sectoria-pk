import { describe, expect, it } from "vitest";
import {
  createStorageAdapter,
  LocalStorageAdapter,
  StorageConfigError,
} from "../index.js";

describe("createStorageAdapter", () => {
  it("returns a local adapter when storage env is blank", () => {
    const adapter = createStorageAdapter({ env: {} });
    expect(adapter).toBeInstanceOf(LocalStorageAdapter);
  });

  it("throws on partial S3 configuration", () => {
    expect(() =>
      createStorageAdapter({
        env: {
          STORAGE_ENDPOINT: "https://s3.example.com",
          STORAGE_BUCKET: "public-bucket",
        },
      }),
    ).toThrow(StorageConfigError);
  });
});

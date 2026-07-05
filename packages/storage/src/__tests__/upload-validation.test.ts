import { describe, expect, it } from "vitest";
import {
  assertAllowedContentType,
  assertAllowedFileSize,
  buildStorageKey,
  InvalidUploadError,
  SOCIETY_DOCUMENT_MAX_BYTES,
} from "../index.js";

describe("upload validation", () => {
  it("rejects disallowed content types", () => {
    expect(() => assertAllowedContentType("text/plain")).toThrow(
      InvalidUploadError,
    );
    try {
      assertAllowedContentType("text/plain");
    } catch (error) {
      expect(error).toMatchObject({ reason: "content_type" });
    }
  });

  it("rejects oversized files", () => {
    expect(() =>
      assertAllowedFileSize(SOCIETY_DOCUMENT_MAX_BYTES + 1),
    ).toThrow(InvalidUploadError);
    try {
      assertAllowedFileSize(SOCIETY_DOCUMENT_MAX_BYTES + 1);
    } catch (error) {
      expect(error).toMatchObject({ reason: "file_size" });
    }
  });

  it("builds non-PII object keys", () => {
    expect(
      buildStorageKey({
        societyId: "soc_1",
        area: "documents",
        objectId: "obj_abc",
        contentType: "application/pdf",
      }),
    ).toBe("societies/soc_1/documents/obj_abc.pdf");
  });
});

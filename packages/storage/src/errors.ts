export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigError";
  }
}

/** Thrown when an upload request fails content-type or size validation. */
export class InvalidUploadError extends Error {
  readonly reason: "content_type" | "file_size";

  constructor(reason: "content_type" | "file_size", message: string) {
    super(message);
    this.name = "InvalidUploadError";
    this.reason = reason;
  }
}

# @sectoria/storage

**S3-compatible object storage with a swappable local mock.** Used by society
profile v2 for gallery media (M1) and downloadable documents (M2).

## Design

- **Interface is the boundary.** `StorageAdapter` exposes `getUploadUrl`,
  `getSignedDownloadUrl`, and `getPublicUrl`. Swapping local for S3/R2 means
  changing env vars only — routers depend on the interface via `TRPCContext`.
- **Blank env → local mock.** Dev and CI need no cloud credentials; URLs are
  deterministic for tests.
- **Upload validation** (content-type allow-list, size cap) lives here and is
  called from `storage.requestUploadUrl` before minting a presigned PUT.

## Usage

```ts
import { createStorageAdapter } from "@sectoria/storage";

const storage = createStorageAdapter();
const publicUrl = storage.getPublicUrl("societies/soc_1/media/hero.jpg");

const { url, expiresAt } = await storage.getUploadUrl({
  key: "societies/soc_1/media/hero.jpg",
  contentType: "image/jpeg",
  bucket: "public",
});
```

See [`ADR-009`](../../docs/architecture/ADR-009-media-document-storage.md) for
the full decision record.

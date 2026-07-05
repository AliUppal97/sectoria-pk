# ADR-009: Media & document object storage

**Status:** Accepted  
**Date:** 2026-07-05

## Context

Society profile v2 (M1 media, M2 documents) stores gallery images, progress
photos, brochures, and sensitive compliance PDFs (LOP/NOC). Uploads must not
pass large file bodies through the Next.js/tRPC server; sensitive downloads
require short-lived signed URLs after an auth/ownership check.

## Decision

Use **S3-compatible object storage** (AWS S3, Cloudflare R2, or MinIO) with:

- **Two buckets:** public-read for marketing media; private for compliance docs.
- **Adapter pattern** in `packages/storage`: `StorageAdapter` with
  `getUploadUrl`, `getSignedDownloadUrl`, and `getPublicUrl`. A
  `LocalStorageAdapter` is selected when storage env vars are blank (dev/CI);
  `S3StorageAdapter` when all credentials are present.
- **Injection:** the adapter is wired into `TRPCContext` — routers never call
  the AWS SDK inline.
- **Upload flow:** `storage.requestUploadUrl` (`societyAdminProcedure`) validates
  content-type (pdf/jpg/png) and size (≤ 10 MiB), mints a presigned PUT, returns
  `storageKey`. Client uploads directly; a subsequent `media.create` /
  `document.create` persists the key.
- **Download flow:** public media → CDN/public URL; public documents → signed
  URL (5 min TTL); private LOP/NOC → `document.getDownloadUrl` after ownership
  check.
- **Object keys:** `societies/{societyId}/{media|documents}/{uuid}.{ext}` — no
  PII in keys or filenames.

## Environment

| Variable | Purpose |
|---|---|
| `STORAGE_ENDPOINT` | S3-compatible API endpoint |
| `STORAGE_BUCKET` | Public-read bucket |
| `STORAGE_BUCKET_PRIVATE` | Private bucket |
| `STORAGE_ACCESS_KEY_ID` | Access key |
| `STORAGE_SECRET_ACCESS_KEY` | Secret key |
| `STORAGE_PUBLIC_BASE_URL` | CDN/public base URL (optional; derived in prod) |

All blank → local mock adapter (no cloud creds required).

## Dependencies

- `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (pinned in
  `dependency-baseline.md`).

## Consequences

- Dev and CI run without cloud credentials.
- CSP adds the storage/CDN host to `img-src`/`connect-src` and virtual-tour
  embed hosts to `frame-src`.
- Replacing R2 with another S3-compatible provider is a config change only.

## Related

- [`society-profile-v2/storage.md`](society-profile-v2/storage.md)
- [`ADR-008`](ADR-008-society-profile-maps.md) (CSP baseline)

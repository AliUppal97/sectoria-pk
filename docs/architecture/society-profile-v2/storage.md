# Media & document storage (ADR-009 summary)

> Cross-cutting concern for M1 (media) and M2 (documents). Build session: **S3**. Read with [`foundations.md`](foundations.md).

Recorded in [`ADR-009`](../ADR-009-media-document-storage.md). Summary for implementers:

- **Storage:** S3-compatible object storage (e.g. Cloudflare R2 / AWS S3). Buckets: public-read for marketing media, private for sensitive docs.
- **Adapter:** a thin storage interface (`packages/storage` or `apps/web/lib/storage`) with `getUploadUrl(key, contentType)`, `getSignedDownloadUrl(key, ttl)`, `getPublicUrl(key)`. Inject the client; no inline SDK calls scattered across routers (mirrors the adapter pattern in `oop-and-domain-modeling.mdc`).
- **Upload flow:** client requests a presigned PUT from a `societyAdminProcedure`; server validates content-type allow-list + size; client uploads directly; server stores the returned `storageKey`. No large file bodies through the tRPC/Next server.
- **Read flow:** public media resolves to a CDN/public URL; private docs mint a short-lived signed URL only after an auth/ownership check.
- **Env:** `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_BUCKET_PRIVATE`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_BASE_URL` added to `.env.example` (blank by default; a local filesystem/mock adapter is used in dev/CI so tests don't require cloud creds).
- **CSP:** `next.config.ts` — add the storage/CDN host to `img-src` and `connect-src`; add `frame-src` for the virtual-tour embed host (Matterport/YouTube). Keep the policy conservative; coordinate with the security-hardening pass.

## Security checklist (applies to every upload/download)

- Server-side content-type allow-list (pdf/jpg/png) + size cap before minting a presigned URL.
- Signed download URLs are short-lived (e.g. 5 min).
- Sensitive documents (LOP/NOC, `isPublic=false`) require an authenticated ownership/role check before a URL is minted.
- No PII in object keys or filenames.
- New SDK dependency must match `docs/architecture/dependency-baseline.md` (pin the exact version).

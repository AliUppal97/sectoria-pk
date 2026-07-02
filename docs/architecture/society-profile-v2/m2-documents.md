# M2 — Documents & downloads

> Read with [`foundations.md`](foundations.md) and [`storage.md`](storage.md). Build sessions: data **S1**, API **S2**, UI **S5**.

**Problem:** Compliance refs are shown as numbers; there's no master plan/brochure/payment-plan PDF, and no LOP/NOC document download.

**Data model** — new `SocietyDocument`:

```prisma
enum SocietyDocumentKind {
  MASTER_PLAN
  BROCHURE
  PAYMENT_PLAN
  LOP          // Letter of Permission (sensitive)
  NOC          // No Objection Certificate (sensitive)
  OTHER
}

model SocietyDocument {
  id          String              @id @default(cuid())
  societyId   String
  society     Society             @relation(fields: [societyId], references: [id])
  kind        SocietyDocumentKind
  title       String
  storageKey  String
  fileSize    Int                 // bytes, for the UI
  contentType String              // validated allow-list (pdf/jpg/png)
  isPublic    Boolean             @default(true)
  sortOrder   Int                 @default(0)
  createdAt   DateTime            @default(now())

  @@index([societyId, kind])
}
```

**Types:** `societyDocumentKindSchema`, `societyDocumentSchema` in `packages/types/src/society-document.ts`.

**API:** `document.router.ts` — `listForSociety` (public; returns only `isPublic` docs with **short-lived signed URLs**), `listForAdmin`, `create`/`update`/`delete` (`societyAdminProcedure` + ownership). Server validates `contentType` against an allow-list and caps `fileSize`.

**UI:** `society-documents.tsx` — download cards grouped by kind (icon, title, file size, type), each a signed-URL link with `rel="noopener"` and `download` attribute. "View PDF" parity with Urban City.

**Security:** LOP/NOC are compliance artifacts; treat as sensitive — signed URLs expire (e.g. 5 min), `isPublic=false` documents require an authenticated ownership/role check before a URL is minted. No PII in filenames. See [`storage.md`](storage.md).

**Acceptance:**
- Public profile lists only public documents; signed URLs expire.
- Upload rejects non-allow-listed content types and oversized files with a typed error.
- File size + type shown before download.

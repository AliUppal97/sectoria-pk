# M1 — Visual media, galleries & virtual tour

> Read with [`foundations.md`](foundations.md) and [`storage.md`](storage.md). Build sessions: data **S1**, API **S2**, UI **S4**.

**Problem:** `heroImageUrl` is intentionally not rendered (seed CDN URLs don't resolve) and there is no gallery. Buyers get initials placeholders.

**Data model** — new `SocietyMedia`:

```prisma
enum SocietyMediaKind {
  HERO
  GALLERY
  PROGRESS   // dated construction/development photos
  FLOORPLAN
}

model SocietyMedia {
  id          String           @id @default(cuid())
  societyId   String
  society     Society          @relation(fields: [societyId], references: [id])
  kind        SocietyMediaKind @default(GALLERY)
  storageKey  String           // object-storage key; resolved to a URL at read time
  alt         String
  caption     String?
  capturedAt  DateTime?        // for PROGRESS ordering ("MAR 2024")
  sortOrder   Int              @default(0)
  width       Int?
  height      Int?
  createdAt   DateTime         @default(now())

  @@index([societyId, kind, sortOrder])
}
```

Also add `Society.virtualTourUrl String?` (Matterport/YouTube/360 embed URL) and `Society.promoVideoUrl String?`.

**Types:** `societyMediaKindSchema`, `societyMediaSchema` in `packages/types/src/society-media.ts`; extend `societySchema` with the two URL fields.

**API:** `media.router.ts` — `listForSociety` (public; resolves `storageKey`→URL), `listForAdmin`, `create`/`update`/`delete`/`reorder` (`societyAdminProcedure` + ownership). Upload uses the storage adapter (see [`storage.md`](storage.md)), presigned PUT.

**UI:**
- Render hero (`kind=HERO` or fallback `heroImageUrl`) as the profile cover with the verification badge overlaid; keep `next/image` with `sizes`/blur placeholder.
- New `society-gallery.tsx`: responsive grid + accessible lightbox (client, dynamic import). Keyboard nav, focus trap, `Esc` to close.
- New `society-progress-gallery.tsx`: `kind=PROGRESS` grouped/ordered by `capturedAt` (Urban City's "Progress You Can See").
- New `society-virtual-tour.tsx`: lazy iframe embed with explicit "load tour" click (no autoload third-party iframe; CSP `frame-src`).

**Five-states / SEO:** empty → keep current initials placeholder; add `ImageObject`/`VideoObject` JSON-LD (see [`seo.md`](seo.md)); OG image uses hero. Video embeds are click-to-load to protect LCP.

**Acceptance:**
- Profile shows a real hero when media exists; graceful placeholder when not.
- Gallery lightbox is keyboard- and screen-reader-accessible (focus trap, alt text).
- Progress photos render newest-first with month/year labels.
- No layout shift (width/height or aspect-ratio reserved).

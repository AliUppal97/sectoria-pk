# M3 — Rich amenities & stat highlights

> Read with [`foundations.md`](foundations.md). Build sessions: data **S1**, API **S2**, UI **S6**.

**Problem:** `amenities String[]` renders as flat pills; no imagery, descriptions, or scale stats.

**Data model:**

```prisma
model AmenityFeature {
  id          String   @id @default(cuid())
  societyId   String
  society     Society  @relation(fields: [societyId], references: [id])
  title       String
  description String   @db.Text
  icon        String?  // lucide icon name (design-system icon set)
  imageKey    String?  // optional object-storage image
  sortOrder   Int      @default(0)

  @@index([societyId, sortOrder])
}

model SocietyHighlight {
  id        String  @id @default(cuid())
  societyId String
  society   Society @relation(fields: [societyId], references: [id])
  label     String  // "Total Area", "Parks", "Front"
  value     String  // "80,000 kanal", "100+", "2,200 ft"
  icon      String?
  sortOrder Int     @default(0)

  @@index([societyId, sortOrder])
}
```

Keep the existing `amenities String[]` for backward compatibility / quick tags; `AmenityFeature` is the rich layer. The profile prefers `AmenityFeature` when present, otherwise falls back to pills.

**Types:** `amenityFeatureSchema`, `societyHighlightSchema` in `packages/types/src/society-feature.ts`.

**API:** folded into `society.router.ts` (or a small `society-feature.router.ts`): public `listForSociety`, admin CRUD + reorder with ownership.

**UI:**
- `society-amenities.tsx` — bento cards (icon/image + title + description), replacing/augmenting the current pill list.
- `society-highlights.tsx` — stat strip ("Driving results"-style) rendered near the hero/trust bento.

**Acceptance:** rich amenity cards render when data exists; pills remain as fallback; highlights are responsive and use design tokens (no inline hex/spacing).

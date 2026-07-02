# M4 — Location & connectivity

> Read with [`foundations.md`](foundations.md). Build sessions: data **S1**, API **S2**, UI **S6**. Maps stay Leaflet/OSM per [ADR-008](../ADR-008-society-profile-maps.md).

**Problem:** Map pin + opt-in distance exist, but there's no curated "what's nearby / how connected" context.

**Data model** — new `NearbyLandmark`:

```prisma
enum LandmarkCategory {
  AIRPORT
  HOSPITAL
  SCHOOL
  UNIVERSITY
  MARKET
  MOSQUE
  HIGHWAY
  INTERCHANGE
  LANDMARK
}

model NearbyLandmark {
  id            String           @id @default(cuid())
  societyId     String
  society       Society          @relation(fields: [societyId], references: [id])
  name          String           // "New Lahore Airport", "M11 Interchange"
  category      LandmarkCategory
  distanceKm    Decimal?
  driveTimeMins Int?             // "5 minutes"
  sortOrder     Int              @default(0)

  @@index([societyId, sortOrder])
}
```

**Types:** `landmarkCategorySchema`, `nearbyLandmarkSchema` in `packages/types/src/nearby-landmark.ts`.

**API:** `landmark.router.ts` (or folded into `society.router.ts`): public read + admin CRUD/reorder with ownership.

**UI:** `society-connectivity.tsx` rendered inside the existing `SocietyLocationSection` — landmark chips/list grouped by category with drive-time, alongside the existing Leaflet map and opt-in distance. Admin-entered values only (ADR-008). Keep the existing Google Maps deep-link button.

**Acceptance:** connectivity list renders with category icons + drive-times; section degrades cleanly when only a map pin exists; no Places API call.

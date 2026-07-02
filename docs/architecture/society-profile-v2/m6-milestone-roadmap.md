# M6 — Milestone roadmap

> Read with [`foundations.md`](foundations.md). Build sessions: data **S1**, API **S2**, UI **S8**.

**Problem:** `SocietyUpdate` is unstructured news. Urban City's "Charting the Path to Excellence" is a dated, ordered roadmap with status.

**Data model:**

```prisma
enum MilestoneStatus {
  COMPLETED
  IN_PROGRESS
  PLANNED
}

model SocietyMilestone {
  id          String          @id @default(cuid())
  societyId   String
  society     Society         @relation(fields: [societyId], references: [id])
  title       String          // "City Oasis Ballot"
  description String?         @db.Text
  occurredOn  DateTime        // "AUG 2024"
  status      MilestoneStatus @default(COMPLETED)
  sortOrder   Int             @default(0)

  @@index([societyId, occurredOn])
}
```

**Types:** `milestoneStatusSchema`, `societyMilestoneSchema` in `packages/types/src/society-milestone.ts`.

**API:** `milestone.router.ts`: public `listForSociety` (chronological), admin CRUD/reorder with ownership.

**UI:** `society-roadmap.tsx` — horizontal/vertical timeline with month-year nodes and status styling (completed/in-progress/planned). Distinct from, and rendered above, the existing `SocietyUpdatesTimeline` (news). Reuse the timeline visual language from `society-updates-timeline.tsx`.

**Acceptance:** roadmap renders milestones ordered by date with clear status states; empty state hidden; coexists with the news timeline.

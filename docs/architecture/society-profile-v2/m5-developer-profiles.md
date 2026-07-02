# M5 — Developer / builder profiles

> Read with [`foundations.md`](foundations.md) and [`seo.md`](seo.md). Build sessions: data **S1**, API **S2**, UI **S7**.

**Problem:** No developer entity. Buyers can't see who is behind a society or their track record — a core credibility signal.

**Data model:**

```prisma
model Developer {
  id          String             @id @default(cuid())
  slug        String             @unique
  name        String
  description String             @db.Text
  logoKey     String?
  websiteUrl  String?
  foundedYear Int?
  createdAt   DateTime           @default(now())

  societies   Society[]
  projects    DeveloperProject[]
}

model DeveloperProject {
  id          String   @id @default(cuid())
  developerId String
  developer   Developer @relation(fields: [developerId], references: [id])
  name        String   // "Al-Hafeez Gardens (Phase 1, 2, 5)"
  description String?  @db.Text
  imageKey    String?
  year        Int?
  city        String?
  sortOrder   Int      @default(0)

  @@index([developerId, sortOrder])
}
```

Add `Society.developerId String?` + relation (nullable for backward compatibility; a society may have a co-development list later, but 1→many covers Urban City's primary case).

**Types:** `developerSchema`, `developerProjectSchema` in `packages/types/src/developer.ts`.

**API:** `developer.router.ts` — public `getBySlug`, `list`; **`superAdminProcedure`** for create/update/projects (developers are platform-curated trust data, not society-self-edited). DTO mappers serialize dates.

**UI:**
- Profile "Developer" credibility block linking to the developer page.
- New public route `apps/web/app/(marketplace)/developers/[slug]/page.tsx` (ISR): developer bio, logo, track-record portfolio grid, and the list of their societies on Sectoria. JSON-LD `Organization`. Add to `sitemap.ts`.

> Note: `/dealers/[slug]` (dealer profiles) already exists and is **gated** by `FEATURE_PUBLIC_DEALER_DIRECTORY`. Developer pages are distinct (builders, not sales agents) and are **not** dealer exposure — they carry no pricing or contact-to-transact path.

**Acceptance:** society profile shows developer + links to their page; developer page lists projects and associated societies; only super-admin can edit developer records.

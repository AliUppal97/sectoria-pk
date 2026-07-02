# M8 — Blog / SEO content hub

> Read with [`foundations.md`](foundations.md) and [`seo.md`](seo.md). Build sessions: data **S1**, API **S2**, UI **S10**.

**Problem:** No editorial/SEO surface ("See what's happening", "Why Urban City is the Future of Real Estate Investment").

**Data model:**

```prisma
model Article {
  id          String    @id @default(cuid())
  slug        String    @unique
  title       String
  excerpt     String    @db.Text
  body        String    @db.Text   // markdown
  coverKey    String?
  authorName  String
  publishedAt DateTime?
  isPublished Boolean   @default(false)
  societyId   String?   // optional association
  society     Society?  @relation(fields: [societyId], references: [id])
  developerId String?
  developer   Developer? @relation(fields: [developerId], references: [id])
  createdAt   DateTime  @default(now())

  @@index([isPublished, publishedAt])
  @@index([societyId])
}
```

**Types:** `articleSchema` in `packages/types/src/article.ts`.

**API:** `article.router.ts` — public `list` (published) + `getBySlug`; **`superAdminProcedure`** for authoring. Markdown rendered server-side with a sanitizer.

**UI:** `apps/web/app/(marketplace)/blog/page.tsx` (list, ISR) and `blog/[slug]/page.tsx` (article, ISR). `Article` JSON-LD; add to `sitemap.ts`. Optional "Related reading" block on society/developer profiles when associated articles exist.

**Acceptance:** blog index + article pages render published markdown safely; unpublished hidden from public; SEO metadata + JSON-LD present; sitemap includes articles.

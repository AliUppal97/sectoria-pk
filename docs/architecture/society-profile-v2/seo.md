# SEO impact

> Cross-cutting concern for M1 (image/video), M5 (developer), M8 (blog). Build sessions: incremental in **S7/S8/S10**, finalized in **S11**. Read with [`foundations.md`](foundations.md).

- Extend `apps/web/lib/seo.ts` builders: `ImageObject` (gallery/hero), `VideoObject` (virtual tour/promo), `Organization` (developer), `Article` (blog). Continue rendering via the shared `<JsonLd>` component (never inline `<script>`).
- `apps/web/app/(marketplace)/sitemap.ts`: add developer pages and published articles; keep society/category entries. **Only `publishStatus = PUBLISHED` societies appear** (see [`m0-onboarding-and-scale.md`](m0-onboarding-and-scale.md)).
- Hero image becomes the society OG image; blog/developer pages get their own OG.
- `generateStaticParams` is capped to the top/most-recent societies; the long tail renders on-demand (ISR) with on-demand revalidation on publish/edit.

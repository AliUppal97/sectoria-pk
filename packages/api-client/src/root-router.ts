import { router } from "./trpc.js";
import { societyRouter } from "./routers/society.router.js";
import { inventoryCategoryRouter } from "./routers/inventory-category.router.js";
import { bookingRouter } from "./routers/booking.router.js";
import { dealerRouter } from "./routers/dealer.router.js";
import { verificationRouter } from "./routers/verification.router.js";
import { reviewRouter } from "./routers/review.router.js";
import { adminRouter } from "./routers/admin.router.js";
import { leadRouter } from "./routers/lead.router.js";
import { quoteRouter } from "./routers/quote.router.js";
import { dealerNetSheetRouter } from "./routers/dealer-net-sheet.router.js";
import { fulfillmentRouter } from "./routers/fulfillment.router.js";
import { societyUpdateRouter } from "./routers/society-update.router.js";
import { mediaRouter } from "./routers/media.router.js";
import { documentRouter } from "./routers/document.router.js";
import { societyFeatureRouter } from "./routers/society-feature.router.js";
import { landmarkRouter } from "./routers/landmark.router.js";
import { developerRouter } from "./routers/developer.router.js";
import { milestoneRouter } from "./routers/milestone.router.js";
import { articleRouter } from "./routers/article.router.js";

/**
 * The application's root tRPC router — the single merged surface the Next.js
 * route handler (`apps/web/app/api/trpc/[trpc]/route.ts`) mounts and the typed
 * client consumes. Each sub-router owns one domain area; none is a catch-all.
 */
export const appRouter = router({
  society: societyRouter,
  inventoryCategory: inventoryCategoryRouter,
  booking: bookingRouter,
  dealer: dealerRouter,
  verification: verificationRouter,
  review: reviewRouter,
  admin: adminRouter,
  lead: leadRouter,
  quote: quoteRouter,
  dealerNetSheet: dealerNetSheetRouter,
  fulfillment: fulfillmentRouter,
  societyUpdate: societyUpdateRouter,
  media: mediaRouter,
  document: documentRouter,
  societyFeature: societyFeatureRouter,
  landmark: landmarkRouter,
  developer: developerRouter,
  milestone: milestoneRouter,
  article: articleRouter,
});

/**
 * The root router's type. `apps/web` imports *this type only* (never the
 * implementation) to derive a fully-typed client with zero manual duplication —
 * a schema change here surfaces as a compile error at every stale call site.
 */
export type AppRouter = typeof appRouter;

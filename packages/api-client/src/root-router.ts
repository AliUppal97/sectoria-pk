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
});

/**
 * The root router's type. `apps/web` imports *this type only* (never the
 * implementation) to derive a fully-typed client with zero manual duplication —
 * a schema change here surfaces as a compile error at every stale call site.
 */
export type AppRouter = typeof appRouter;

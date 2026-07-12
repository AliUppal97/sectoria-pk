import Link from "next/link";
import { Button } from "@sectoria/ui";
import { MARKETPLACE_ROUTES } from "@/lib/marketplace-nav";

/**
 * Soft next-step CTAs after discovery proof — Compare + Get best price
 * (concierge). Sole conversion path stays advisor-led.
 */
export function HomeNextStepBand() {
  return (
    <section className="border-t border-border-base bg-surface-subtle">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-sans text-xl font-bold text-text-primary">
            Ready for the next step?
          </h2>
          <p className="max-w-xl font-sans text-sm text-text-secondary">
            Compare societies side by side, or request the best price through a
            Sectoria advisor.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="ghost" size="lg">
            <Link href={MARKETPLACE_ROUTES.compare.href}>
              {MARKETPLACE_ROUTES.compare.label}
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link href={MARKETPLACE_ROUTES.support.href}>
              {MARKETPLACE_ROUTES.support.label}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

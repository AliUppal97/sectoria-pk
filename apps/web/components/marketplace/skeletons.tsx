import { Skeleton } from "@sectoria/ui";

/**
 * Content-shaped loading skeletons (design spec §5.10 — a skeleton matches the
 * eventual content's shape, never a bare spinner). Used by route-level
 * `loading.tsx` files so navigations stream a meaningful placeholder.
 */

/** Mirrors {@link SocietyCard}: image, badge row, title, price, CTA. */
export function SocietyCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border-base bg-surface-card shadow-sm">
      <Skeleton className="h-40 rounded-none" />
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-24" />
        <div className="mt-1 flex items-end justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="mt-2 h-10 w-full" />
      </div>
    </div>
  );
}

/** A responsive grid of society-card skeletons. */
export function SocietyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <SocietyCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** A simple stacked-lines skeleton for headings/intro blocks. */
export function HeadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full max-w-xl" />
    </div>
  );
}

import { Skeleton } from "@sectoria/ui";

export default function DealerProfileLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <Skeleton className="h-4 w-48" />
      <div className="mt-6 flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-9 w-56" />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-40 rounded-2xl sm:col-span-2" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl sm:col-span-2" />
      </div>
    </div>
  );
}

import { Skeleton } from "@sectoria/ui";

export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-56" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-56 rounded-2xl sm:col-span-2 sm:row-span-2" />
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
        <Skeleton className="h-44 rounded-2xl sm:col-span-2" />
      </div>
    </div>
  );
}

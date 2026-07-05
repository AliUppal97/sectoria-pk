import { Skeleton } from "@sectoria/ui";

/** Content-shaped skeleton while a developer profile loads (ISR on-demand). */
export default function DeveloperProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
      <Skeleton className="mb-4 h-4 w-48" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Skeleton className="h-16 w-16 rounded-xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-full max-w-2xl" />
        </div>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

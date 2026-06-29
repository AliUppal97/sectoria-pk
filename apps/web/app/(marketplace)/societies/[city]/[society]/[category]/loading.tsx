import { Skeleton } from "@sectoria/ui";

export default function CategoryLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <Skeleton className="h-4 w-56" />
      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <div className="flex flex-1 flex-col gap-6">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl lg:w-80" />
      </div>
    </div>
  );
}

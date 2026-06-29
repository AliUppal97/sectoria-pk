import { Skeleton } from "@sectoria/ui";

export default function SocietyProfileLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="border-b border-border-base bg-surface-card">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="mt-4 h-5 w-40" />
          <Skeleton className="mt-3 h-9 w-72" />
          <Skeleton className="mt-3 h-4 w-48" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-4 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

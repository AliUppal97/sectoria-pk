import { Skeleton } from "@sectoria/ui";
import { HeadingSkeleton } from "@/components/marketplace/skeletons";

export default function CompareLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <HeadingSkeleton />
      <Skeleton className="mt-8 h-10 w-full max-w-xs rounded-md" />
      <Skeleton className="mt-4 h-96 w-full rounded-xl" />
    </div>
  );
}

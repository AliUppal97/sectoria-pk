import { Skeleton } from "@sectoria/ui";
import {
  HeadingSkeleton,
  SocietyGridSkeleton,
} from "@/components/marketplace/skeletons";

export default function HomeLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-6 h-12 w-full max-w-2xl" />
        <Skeleton className="mt-4 h-5 w-full max-w-xl" />
        <div className="mt-6 flex gap-3">
          <Skeleton className="h-11 w-44" />
          <Skeleton className="h-11 w-44" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-16 sm:px-6">
        <HeadingSkeleton />
        <div className="mt-8">
          <SocietyGridSkeleton />
        </div>
      </div>
    </div>
  );
}

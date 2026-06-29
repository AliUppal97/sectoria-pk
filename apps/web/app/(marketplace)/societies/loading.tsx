import { Skeleton } from "@sectoria/ui";
import {
  HeadingSkeleton,
  SocietyGridSkeleton,
} from "@/components/marketplace/skeletons";

export default function SocietiesLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <HeadingSkeleton />
      <Skeleton className="mt-8 h-28 w-full rounded-xl" />
      <div className="mt-8">
        <SocietyGridSkeleton />
      </div>
    </div>
  );
}

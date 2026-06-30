import { Skeleton } from "@sectoria/ui";
import { BentoGrid } from "@/components/marketplace/bento";

export default function AdminDashboardLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-64" />
      <Skeleton className="mb-2 h-4 w-96 max-w-full" />
      <BentoGrid className="mt-8">
        <Skeleton className="min-h-[220px] sm:col-span-2 sm:row-span-2 rounded-2xl" />
        <Skeleton className="min-h-[100px] rounded-2xl" />
        <Skeleton className="min-h-[100px] rounded-2xl" />
        <Skeleton className="min-h-[100px] rounded-2xl" />
        <Skeleton className="min-h-[100px] rounded-2xl" />
        <Skeleton className="min-h-[180px] sm:col-span-2 rounded-2xl" />
      </BentoGrid>
    </div>
  );
}

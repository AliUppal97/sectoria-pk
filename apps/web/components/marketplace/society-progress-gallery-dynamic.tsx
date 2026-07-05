"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@sectoria/ui";
import type { SocietyMediaPublic } from "@/lib/society-media";

function SocietyProgressGallerySkeleton() {
  return (
    <section className="border-t border-border-base">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="aspect-[3/2] w-full rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}

const SocietyProgressGallery = dynamic(
  () =>
    import("@/components/marketplace/society-progress-gallery").then(
      (module) => module.SocietyProgressGallery,
    ),
  { ssr: false, loading: () => <SocietyProgressGallerySkeleton /> },
);

/** Client boundary for progress gallery lightbox — dynamic import preserves ISR/SEO. */
export function SocietyProgressGalleryDynamic({
  societyName,
  items,
  degraded = false,
}: {
  societyName: string;
  items: readonly SocietyMediaPublic[];
  degraded?: boolean;
}) {
  if (!degraded && items.length === 0) return null;

  return (
    <SocietyProgressGallery
      societyName={societyName}
      items={items}
      degraded={degraded}
    />
  );
}

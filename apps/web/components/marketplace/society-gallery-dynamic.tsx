"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@sectoria/ui";
import type { SocietyMediaPublic } from "@/lib/society-media";

function SocietyGallerySkeleton() {
  return (
    <section className="border-t border-border-base bg-surface-base">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="aspect-[4/3] w-full rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}

const SocietyGallery = dynamic(
  () =>
    import("@/components/marketplace/society-gallery").then(
      (module) => module.SocietyGallery,
    ),
  { ssr: false, loading: () => <SocietyGallerySkeleton /> },
);

/** Client boundary for the gallery lightbox — dynamic import preserves ISR/SEO. */
export function SocietyGalleryDynamic({
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
    <SocietyGallery
      societyName={societyName}
      items={items}
      degraded={degraded}
    />
  );
}

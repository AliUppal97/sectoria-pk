"use client";

import Image from "next/image";
import { Images } from "lucide-react";
import { EmptyState } from "@sectoria/ui";
import { SectionHeading } from "@/components/marketplace/section-heading";
import {
  SOCIETY_MEDIA_BLUR_DATA_URL,
  type SocietyMediaPublic,
} from "@/lib/society-media";
import { useSocietyMediaLightbox } from "./society-media-lightbox";

/**
 * Responsive photo gallery with an accessible lightbox (M1).
 */
export function SocietyGallery({
  societyName,
  items,
  degraded = false,
}: {
  societyName: string;
  items: readonly SocietyMediaPublic[];
  /** When media failed to load server-side, show a recovery empty state. */
  degraded?: boolean;
}) {
  const { setOpenIndex, SocietyMediaLightbox } = useSocietyMediaLightbox(items);

  if (degraded) {
    return (
      <section className="border-t border-border-base bg-surface-base">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
          <SectionHeading
            eyebrow="Gallery"
            title="Photos"
            description="Official imagery published by the society."
          />
          <div className="mt-8">
            <EmptyState
              heading="Gallery temporarily unavailable"
              description="We couldn't load photos for this society right now. Please refresh the page or try again shortly."
            />
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="border-t border-border-base bg-surface-base">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Gallery"
          title="Photos"
          description={`Explore ${societyName} through official photography — tap any image to view full size.`}
        />

        <ul
          className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
          aria-live="polite"
        >
          {items.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setOpenIndex(index)}
                className="group relative block w-full overflow-hidden rounded-xl border border-border-base bg-surface-card text-left transition-colors duration-200 ease-default hover:border-brand-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-light focus-visible:ring-offset-2"
                aria-label={`View full size: ${item.alt}`}
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={item.url}
                    alt={item.alt}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    placeholder="blur"
                    blurDataURL={SOCIETY_MEDIA_BLUR_DATA_URL}
                    className="object-cover transition-transform duration-200 ease-default group-hover:scale-[1.02] motion-reduce:transform-none"
                  />
                </div>
                {item.caption ? (
                  <span className="flex items-center gap-1.5 px-3 py-2 font-sans text-xs text-text-secondary">
                    <Images aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    {item.caption}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {SocietyMediaLightbox}
    </section>
  );
}

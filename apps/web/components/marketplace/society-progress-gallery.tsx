"use client";

import Image from "next/image";
import { TrendingUp } from "lucide-react";
import { EmptyState } from "@sectoria/ui";
import { SectionHeading } from "@/components/marketplace/section-heading";
import {
  SOCIETY_MEDIA_BLUR_DATA_URL,
  formatProgressDateLabel,
  type SocietyMediaPublic,
} from "@/lib/society-media";
import { useSocietyMediaLightbox } from "./society-media-lightbox";

/**
 * Construction progress gallery — PROGRESS media newest-first with month/year
 * labels (M1 "Progress You Can See").
 */
export function SocietyProgressGallery({
  societyName,
  items,
  degraded = false,
}: {
  societyName: string;
  items: readonly SocietyMediaPublic[];
  degraded?: boolean;
}) {
  const { setOpenIndex, SocietyMediaLightbox } = useSocietyMediaLightbox(items);

  if (degraded) {
    return (
      <section className="border-t border-border-base">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
          <SectionHeading
            eyebrow="Development"
            title="Progress you can see"
            description="Dated construction photos published by the society."
          />
          <div className="mt-8">
            <EmptyState
              heading="Progress photos temporarily unavailable"
              description="We couldn't load development photos right now. Please refresh the page or try again shortly."
            />
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="border-t border-border-base">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Development"
          title="Progress you can see"
          description={`Track how ${societyName} is taking shape — newest photos first.`}
        />

        <ul
          className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-live="polite"
        >
          {items.map((item, index) => {
            const dateLabel =
              item.capturedAt !== null && item.capturedAt !== undefined
                ? formatProgressDateLabel(item.capturedAt)
                : null;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(index)}
                  className="group flex w-full flex-col overflow-hidden rounded-xl border border-border-base bg-surface-card text-left transition-colors duration-200 ease-default hover:border-brand-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-light focus-visible:ring-offset-2"
                  aria-label={
                    dateLabel
                      ? `View progress photo from ${dateLabel}: ${item.alt}`
                      : `View progress photo: ${item.alt}`
                  }
                >
                  <div className="relative aspect-[3/2] w-full">
                    <Image
                      src={item.url}
                      alt={item.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      placeholder="blur"
                      blurDataURL={SOCIETY_MEDIA_BLUR_DATA_URL}
                      className="object-cover transition-transform duration-200 ease-default group-hover:scale-[1.02] motion-reduce:transform-none"
                    />
                    {dateLabel ? (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-brand-navy/80 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-wide text-text-inverse">
                        <TrendingUp aria-hidden="true" className="h-3.5 w-3.5" />
                        {dateLabel}
                      </span>
                    ) : null}
                  </div>
                  {item.caption ? (
                    <span className="px-4 py-3 font-sans text-sm text-text-secondary">
                      {item.caption}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {SocietyMediaLightbox}
    </section>
  );
}

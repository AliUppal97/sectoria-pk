"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  cn,
} from "@sectoria/ui";
import {
  SOCIETY_MEDIA_BLUR_DATA_URL,
  type SocietyMediaPublic,
} from "@/lib/society-media";

interface LightboxItem {
  readonly src: string;
  readonly alt: string;
  readonly caption?: string | null;
  readonly width: number;
  readonly height: number;
}

function toLightboxItem(item: SocietyMediaPublic): LightboxItem {
  return {
    src: item.url,
    alt: item.alt,
    caption: item.caption,
    width: item.width ?? 1600,
    height: item.height ?? 900,
  };
}

/**
 * Accessible image lightbox with Radix focus trap, keyboard navigation, and
 * screen-reader labels (M1 gallery / progress photos).
 */
export function SocietyMediaLightbox({
  items,
  openIndex,
  onOpenChange,
}: {
  items: readonly LightboxItem[];
  openIndex: number | null;
  onOpenChange: (index: number | null) => void;
}) {
  const isOpen = openIndex !== null && openIndex >= 0 && openIndex < items.length;
  const activeIndex = isOpen ? openIndex : 0;
  const active = items[activeIndex];

  const goTo = useCallback(
    (next: number) => {
      if (items.length === 0) return;
      const wrapped = (next + items.length) % items.length;
      onOpenChange(wrapped);
    },
    [items.length, onOpenChange],
  );

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(activeIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(activeIndex + 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, goTo, isOpen]);

  if (!active) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onOpenChange(null);
      }}
    >
      <DialogContent
        className={cn(
          "max-w-5xl border-0 bg-transparent p-0 shadow-none",
          "focus-visible:outline-none",
        )}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{active.alt}</DialogTitle>
        <DialogDescription className="sr-only">
          Image {activeIndex + 1} of {items.length}. Use arrow keys to navigate,
          Escape to close.
        </DialogDescription>

        <div className="relative flex flex-col gap-3">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-brand-navy">
            <Image
              src={active.src}
              alt={active.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 1024px"
              placeholder="blur"
              blurDataURL={SOCIETY_MEDIA_BLUR_DATA_URL}
              className="object-contain"
              priority
            />
          </div>

          {items.length > 1 ? (
            <div className="flex items-center justify-between gap-4 px-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-text-inverse hover:bg-brand-navy/40"
                aria-label="Previous image"
                onClick={() => goTo(activeIndex - 1)}
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                Previous
              </Button>
              <span className="font-sans text-sm text-text-inverse">
                {activeIndex + 1} / {items.length}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-text-inverse hover:bg-brand-navy/40"
                aria-label="Next image"
                onClick={() => goTo(activeIndex + 1)}
              >
                Next
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          ) : null}

          {active.caption ? (
            <p className="px-1 text-center font-sans text-sm text-text-inverse">
              {active.caption}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useSocietyMediaLightbox(items: readonly SocietyMediaPublic[]) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const lightboxItems = items.map(toLightboxItem);

  return {
    openIndex,
    setOpenIndex,
    lightboxItems,
    SocietyMediaLightbox: (
      <SocietyMediaLightbox
        items={lightboxItems}
        openIndex={openIndex}
        onOpenChange={setOpenIndex}
      />
    ),
  };
}

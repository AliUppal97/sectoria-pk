"use client";

import { useState } from "react";
import { Play, Rotate3d } from "lucide-react";
import { Button } from "@sectoria/ui";
import { SectionHeading } from "@/components/marketplace/section-heading";

interface EmbedCardProps {
  readonly title: string;
  readonly description: string;
  readonly embedUrl: string;
  readonly loadLabel: string;
  readonly icon: "tour" | "video";
}

function EmbedCard({
  title,
  description,
  embedUrl,
  loadLabel,
  icon,
}: EmbedCardProps) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="font-sans text-md font-semibold text-text-primary">
          {title}
        </h3>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border-base bg-surface-subtle">
          <iframe
            src={embedUrl}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  const Icon = icon === "tour" ? Rotate3d : Play;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border-base bg-surface-card p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-brand-navy-mid">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-sans text-md font-semibold text-text-primary">
            {title}
          </h3>
          <p className="font-sans text-sm text-text-secondary">{description}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        className="w-full sm:w-auto"
        onClick={() => setLoaded(true)}
      >
        {loadLabel}
      </Button>
    </div>
  );
}

/**
 * Virtual tour and promo video embeds — click-to-load only (no third-party
 * autoload; protects LCP and respects CSP `frame-src`).
 */
export function SocietyVirtualTour({
  societyName,
  virtualTourUrl,
  promoVideoUrl,
}: {
  societyName: string;
  virtualTourUrl?: string | null;
  promoVideoUrl?: string | null;
}) {
  const hasTour =
    virtualTourUrl !== null &&
    virtualTourUrl !== undefined &&
    virtualTourUrl.length > 0;
  const hasVideo =
    promoVideoUrl !== null &&
    promoVideoUrl !== undefined &&
    promoVideoUrl.length > 0;

  if (!hasTour && !hasVideo) return null;

  return (
    <section className="border-t border-border-base bg-surface-base">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Experience"
          title="Tour & video"
          description={`Explore ${societyName} before you visit — embeds load only when you choose.`}
        />

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {hasTour ? (
            <EmbedCard
              title="Virtual tour"
              description="Walk through the society in 360° — loads on your request to keep the page fast."
              embedUrl={virtualTourUrl}
              loadLabel="Load virtual tour"
              icon="tour"
            />
          ) : null}
          {hasVideo ? (
            <EmbedCard
              title="Promotional video"
              description="Official society video — plays inside the page after you tap load."
              embedUrl={promoVideoUrl}
              loadLabel="Load video"
              icon="video"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

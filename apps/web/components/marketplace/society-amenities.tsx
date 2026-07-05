import Image from "next/image";
import { CheckCircle2, Sparkles } from "lucide-react";
import { EmptyState, Skeleton } from "@sectoria/ui";
import { BentoCell, BentoGrid } from "@/components/marketplace/bento";
import { SectionHeading } from "@/components/marketplace/section-heading";
import { LUCIDE_ICON_MAP } from "@/lib/lucide-icon";
import {
  resolveAmenityImageUrl,
  type AmenityFeaturePublic,
} from "@/lib/society-features";
import { SOCIETY_MEDIA_BLUR_DATA_URL } from "@/lib/society-media";

function AmenityCard({ feature }: { feature: AmenityFeaturePublic }) {
  const Icon = LUCIDE_ICON_MAP[feature.icon?.trim().toLowerCase() ?? ""] ?? Sparkles;
  const imageUrl = resolveAmenityImageUrl(feature.imageKey);

  return (
    <BentoCell className="flex flex-col gap-4">
      {imageUrl ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border-base bg-surface-subtle">
          <Image
            src={imageUrl}
            alt={feature.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            placeholder="blur"
            blurDataURL={SOCIETY_MEDIA_BLUR_DATA_URL}
            className="object-cover"
          />
        </div>
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-subtle text-brand-navy-mid">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      )}
      <div className="flex flex-col gap-2">
        <h3 className="font-sans text-md font-semibold text-text-primary">
          {feature.title}
        </h3>
        <p className="font-sans text-sm leading-relaxed text-text-secondary">
          {feature.description}
        </p>
      </div>
    </BentoCell>
  );
}

/** Pill fallback for societies without rich AmenityFeature rows. */
export function SocietyAmenitiesPills({
  amenities,
}: {
  amenities: readonly string[];
}) {
  if (amenities.length === 0) return null;

  return (
    <BentoCell size="wide" className="flex flex-col gap-3">
      <h2 className="font-sans text-md font-semibold text-text-primary">
        Amenities
      </h2>
      <ul className="flex flex-wrap gap-2">
        {amenities.map((amenity) => (
          <li
            key={amenity}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1 font-sans text-xs text-text-secondary"
          >
            <CheckCircle2
              aria-hidden="true"
              className="h-3.5 w-3.5 text-success"
            />
            {amenity}
          </li>
        ))}
      </ul>
    </BentoCell>
  );
}

function SocietyAmenitiesSkeleton() {
  return (
    <section className="border-t border-border-base bg-surface-base">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-56" />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Rich amenity bento cards from AmenityFeature (M3). When no rich features
 * exist, use {@link SocietyAmenitiesPills} in the trust bento instead.
 */
export function SocietyAmenities({
  societyName,
  features,
  degraded = false,
  loading = false,
}: {
  societyName: string;
  features: readonly AmenityFeaturePublic[];
  degraded?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return <SocietyAmenitiesSkeleton />;
  }

  if (degraded) {
    return (
      <section className="border-t border-border-base bg-surface-base">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
          <SectionHeading
            eyebrow="Amenities"
            title="What this society offers"
            description={`Facilities and infrastructure published by ${societyName}.`}
          />
          <div className="mt-8">
            <EmptyState
              heading="Amenities temporarily unavailable"
              description="We couldn't load amenity details for this society right now. Please refresh the page or try again shortly."
            />
          </div>
        </div>
      </section>
    );
  }

  if (features.length === 0) return null;

  return (
    <section className="border-t border-border-base bg-surface-base">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Amenities"
          title="What this society offers"
          description={`Facilities and infrastructure published by ${societyName}.`}
        />
        <BentoGrid className="mt-8" aria-live="polite">
          {features.map((feature) => (
            <AmenityCard key={feature.id} feature={feature} />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}

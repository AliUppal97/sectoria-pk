import Image from "next/image";
import type { VerificationTier } from "@sectoria/database";
import { cn } from "@sectoria/ui";
import { VerificationTierBadge } from "@/components/marketplace/verification-badge";
import { SocietyThumbnail } from "@/components/marketplace/society-thumbnail";
import {
  SOCIETY_MEDIA_BLUR_DATA_URL,
  type ResolvedHeroImage,
} from "@/lib/society-media";

/**
 * Full-width society profile hero (M1). Renders real media when available;
 * otherwise falls back to the deterministic initials placeholder (no broken CDN).
 */
export function SocietyHero({
  societyName,
  hero,
  verificationTier,
  className,
}: {
  societyName: string;
  hero: ResolvedHeroImage | null;
  verificationTier: VerificationTier;
  className?: string;
}) {
  return (
    <section
      aria-label={`${societyName} cover`}
      className={cn("relative w-full bg-brand-navy", className)}
    >
      <div className="relative mx-auto aspect-[21/9] w-full max-w-[1280px] sm:aspect-[2.4/1]">
        {hero ? (
          <Image
            src={hero.src}
            alt={hero.alt}
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1280px"
            placeholder="blur"
            blurDataURL={SOCIETY_MEDIA_BLUR_DATA_URL}
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0">
            <SocietyThumbnail
              name={societyName}
              rounded="all"
              className="h-full w-full rounded-none"
            />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-navy/50 via-transparent to-transparent" />

        <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
          <VerificationTierBadge tier={verificationTier} />
        </div>
      </div>
    </section>
  );
}

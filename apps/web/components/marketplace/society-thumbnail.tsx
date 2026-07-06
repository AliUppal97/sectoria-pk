import Image from "next/image";
import { cn } from "@sectoria/ui";
import {
  SOCIETY_MEDIA_BLUR_DATA_URL,
  isResolvableImageUrl,
} from "@/lib/society-media";

/**
 * Society cover for cards and profile fallbacks.
 *
 * Seed societies use a placeholder CDN host that does not resolve — those keep
 * the deterministic initials panel. Real URLs (e.g. Urban City official CDN)
 * render via `next/image`.
 */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function SocietyThumbnail({
  name,
  imageUrl,
  className,
  rounded = "top",
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
  rounded?: "top" | "all";
}) {
  const roundedClass = rounded === "top" ? "rounded-t-2xl" : "rounded-2xl";
  const src = imageUrl && isResolvableImageUrl(imageUrl) ? imageUrl : null;

  if (src) {
    return (
      <div
        className={cn(
          "relative h-40 w-full overflow-hidden bg-brand-navy",
          roundedClass,
          className,
        )}
      >
        <Image
          src={src}
          alt={`${name} cover photo`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          placeholder="blur"
          blurDataURL={SOCIETY_MEDIA_BLUR_DATA_URL}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${name} cover image placeholder`}
      className={cn(
        "flex h-40 items-center justify-center bg-gradient-to-br from-brand-navy to-brand-navy-mid",
        roundedClass,
        className,
      )}
    >
      <span className="font-sans text-4xl font-bold tracking-tight text-text-inverse/90">
        {initials(name)}
      </span>
    </div>
  );
}

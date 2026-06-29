import { cn } from "@sectoria/ui";

/**
 * Branded placeholder for society imagery.
 *
 * Seed data points `heroImageUrl` at a placeholder CDN host that does not
 * resolve, so rendering a real `next/image` would produce a broken request and
 * a poor first impression on a trust-led product. Until real imagery is wired,
 * we draw a deterministic navy panel with the society's initials — no network,
 * no layout shift, and a consistent look. When a loadable URL exists later,
 * swap this for `next/image` with explicit dimensions (nextjs-app-router.mdc).
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
  className,
  rounded = "top",
}: {
  name: string;
  className?: string;
  rounded?: "top" | "all";
}) {
  return (
    <div
      role="img"
      aria-label={`${name} cover image placeholder`}
      className={cn(
        "flex h-40 items-center justify-center bg-gradient-to-br from-brand-navy to-brand-navy-mid",
        rounded === "top" ? "rounded-t-2xl" : "rounded-2xl",
        className,
      )}
    >
      <span className="font-sans text-4xl font-bold tracking-tight text-text-inverse/90">
        {initials(name)}
      </span>
    </div>
  );
}

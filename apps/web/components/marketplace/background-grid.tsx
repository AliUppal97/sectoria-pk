import { cn } from "@sectoria/ui";

/**
 * The subtle Vercel-style background grid (design spec §4.3) — a barely-visible
 * decorative texture for marketplace hero/section backgrounds only. Decorative,
 * so it is `aria-hidden` and pointer-transparent; the `.bg-grid` image itself is
 * defined in globals.css from the border token.
 */
export function BackgroundGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-grid pointer-events-none absolute inset-0 opacity-15",
        className,
      )}
    />
  );
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges conditional className values and de-duplicates conflicting
 * Tailwind utilities (the later class wins). The standard className helper
 * used by every component in this package.
 *
 * @example
 * cn("px-2 py-1", isActive && "bg-brand-navy", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

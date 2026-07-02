"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@sectoria/types";
import { auth } from "@/auth";
import { societyPath } from "@/lib/marketplace";

/**
 * On-demand cache invalidation for a society's public surfaces (M0.7).
 *
 * The lifecycle mutations live in `@sectoria/api-client` (framework-agnostic, no
 * Next.js `revalidatePath`), so the console calls this action after a
 * publish/unpublish/archive/edit to refresh the ISR-cached public pages
 * immediately instead of waiting out the 6-hour `revalidate` window.
 *
 * Gated to platform admins — cache busting is cheap but should not be an open
 * endpoint (`security.mdc`).
 */
export async function revalidateSociety(
  citySlug: string,
  slug: string,
): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) return;

  revalidatePath(societyPath(citySlug, slug));
  revalidatePath("/societies");
  revalidatePath("/sitemap.xml");
}

import "server-only";
import { redirect } from "next/navigation";
import { UserRole } from "@sectoria/types";
import { prisma } from "@sectoria/database";
import { auth } from "@/auth";
import { homeForRole } from "@/lib/auth/roles";

/** Profile fields the dealer portal needs, read fresh from the database. */
export interface CurrentDealer {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly phone: string;
  readonly role: UserRole;
  readonly agencyName: string;
  readonly slug: string;
}

/**
 * Resolves the authenticated dealer partner or redirects to login / the correct
 * portal for other roles.
 */
export async function getCurrentDealer(): Promise<CurrentDealer> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dealer-portal");
  }

  if (
    session.user.role !== undefined &&
    session.user.role !== UserRole.DEALER_PARTNER &&
    session.user.role !== UserRole.SUPER_ADMIN
  ) {
    redirect(homeForRole(session.user.role));
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      dealerProfile: {
        select: { id: true, agencyName: true, slug: true },
      },
    },
  });

  if (user === null || user.dealerProfile === null) {
    redirect("/login?callbackUrl=/dealer-portal");
  }

  return {
    id: user.dealerProfile.id,
    userId: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    agencyName: user.dealerProfile.agencyName,
    slug: user.dealerProfile.slug,
  };
}

import "server-only";
import { redirect } from "next/navigation";
import { UserRole } from "@sectoria/types";
import { prisma } from "@sectoria/database";
import { auth } from "@/auth";
import { homeForRole } from "@/lib/auth/roles";

/** Profile fields the society portal needs, read fresh from the database. */
export interface CurrentSocietyAdmin {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly role: UserRole;
  readonly societyId: string;
  readonly societyName: string;
}

/**
 * Resolves the authenticated society administrator or redirects to login /
 * the correct portal for other roles.
 */
export async function getCurrentSocietyAdmin(): Promise<CurrentSocietyAdmin> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/society-portal");
  }

  if (
    session.user.role !== undefined &&
    session.user.role !== UserRole.SOCIETY_ADMIN &&
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
      societyId: true,
      society: { select: { id: true, name: true } },
    },
  });

  if (user === null) {
    redirect("/login?callbackUrl=/society-portal");
  }

  if (user.role === UserRole.SOCIETY_ADMIN && user.societyId === null) {
    redirect("/login?callbackUrl=/society-portal");
  }

  const societyId = user.societyId ?? user.society?.id;
  if (societyId === undefined) {
    redirect("/login?callbackUrl=/society-portal");
  }

  const societyName =
    user.society?.name ??
    (
      await prisma.society.findUnique({
        where: { id: societyId },
        select: { name: true },
      })
    )?.name ??
    "Your society";

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    societyId,
    societyName,
  };
}

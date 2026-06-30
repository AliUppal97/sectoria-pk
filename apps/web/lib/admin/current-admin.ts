import { redirect } from "next/navigation";
import { UserRole } from "@sectoria/types";
import { auth } from "@/auth";
import { homeForRole } from "@/lib/auth/roles";

export interface CurrentAdmin {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
}

/**
 * Resolves the authenticated platform administrator or redirects to login /
 * the correct portal for other roles.
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }

  if (
    session.user.role !== undefined &&
    session.user.role !== UserRole.SUPER_ADMIN
  ) {
    redirect(homeForRole(session.user.role));
  }

  return {
    id: session.user.id,
    name: session.user.name ?? "Platform admin",
    phone: "",
    role: session.user.role ?? UserRole.SUPER_ADMIN,
  };
}

import { redirect } from "next/navigation";
import { UserRole } from "@sectoria/types";
import { auth } from "@/auth";
import { homeForRole } from "@/lib/auth/roles";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";
import { TRPCReactProvider } from "@/lib/trpc/react";
import { SocietyShell } from "@/components/society/society-shell";

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.BUYER]: "Buyer",
  [UserRole.SOCIETY_ADMIN]: "Society admin",
  [UserRole.DEALER_PARTNER]: "Dealer partner",
  [UserRole.SALES_ADVISOR]: "Sales advisor",
  [UserRole.SUPER_ADMIN]: "Platform admin",
};

/**
 * Authenticated society-admin portal. Middleware is the coarse gate; this
 * layout re-checks the session and provides the shell + tRPC client for
 * interactive mutations beneath it.
 */
export default async function SocietyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/society-portal");
  }
  if (
    session.user.role !== undefined &&
    session.user.role !== UserRole.SOCIETY_ADMIN &&
    session.user.role !== UserRole.SUPER_ADMIN
  ) {
    redirect(homeForRole(session.user.role));
  }

  const admin = await getCurrentSocietyAdmin();

  return (
    <TRPCReactProvider>
      <SocietyShell
        user={{
          name: admin.name,
          roleLabel: ROLE_LABEL[admin.role],
          societyName: admin.societyName,
        }}
      >
        {children}
      </SocietyShell>
    </TRPCReactProvider>
  );
}

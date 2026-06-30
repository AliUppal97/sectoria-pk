import { redirect } from "next/navigation";
import { UserRole } from "@sectoria/types";
import { auth } from "@/auth";
import { homeForRole } from "@/lib/auth/roles";
import { TRPCReactProvider } from "@/lib/trpc/react";
import { AdminShell } from "@/components/admin/admin-shell";

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.BUYER]: "Buyer",
  [UserRole.SOCIETY_ADMIN]: "Society admin",
  [UserRole.DEALER_PARTNER]: "Dealer partner",
  [UserRole.SUPER_ADMIN]: "Platform admin",
};

/**
 * Authenticated platform-admin portal. Middleware is the coarse gate; this
 * layout re-checks the session and provides the shell + tRPC client for
 * interactive mutations beneath it.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }
  if (
    session.user.role !== undefined &&
    session.user.role !== UserRole.SUPER_ADMIN
  ) {
    redirect(homeForRole(session.user.role));
  }

  return (
    <TRPCReactProvider>
      <AdminShell
        user={{
          name: session.user.name ?? "Platform admin",
          roleLabel: ROLE_LABEL[UserRole.SUPER_ADMIN],
        }}
      >
        {children}
      </AdminShell>
    </TRPCReactProvider>
  );
}

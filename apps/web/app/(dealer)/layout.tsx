import { redirect } from "next/navigation";
import { UserRole } from "@sectoria/types";
import { auth } from "@/auth";
import { homeForRole } from "@/lib/auth/roles";
import { getCurrentDealer } from "@/lib/dealer/current-dealer";
import { TRPCReactProvider } from "@/lib/trpc/react";
import { DealerShell } from "@/components/dealer/dealer-shell";

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.BUYER]: "Buyer",
  [UserRole.SOCIETY_ADMIN]: "Society admin",
  [UserRole.DEALER_PARTNER]: "Dealer partner",
  [UserRole.SUPER_ADMIN]: "Platform admin",
};

/**
 * Authenticated dealer-partner portal. Middleware is the coarse gate; this
 * layout re-checks the session and provides the shell + tRPC client for
 * interactive mutations beneath it.
 */
export default async function DealerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dealer-portal");
  }
  if (
    session.user.role !== undefined &&
    session.user.role !== UserRole.DEALER_PARTNER &&
    session.user.role !== UserRole.SUPER_ADMIN
  ) {
    redirect(homeForRole(session.user.role));
  }

  const dealer = await getCurrentDealer();

  return (
    <TRPCReactProvider>
      <DealerShell
        user={{
          name: dealer.name,
          roleLabel: ROLE_LABEL[dealer.role],
          agencyName: dealer.agencyName,
          slug: dealer.slug,
        }}
      >
        {children}
      </DealerShell>
    </TRPCReactProvider>
  );
}

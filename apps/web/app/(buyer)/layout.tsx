import { redirect } from "next/navigation";
import { UserRole } from "@sectoria/types";
import { auth } from "@/auth";
import { homeForRole } from "@/lib/auth/roles";
import { isConciergeMode } from "@/lib/feature-flags";
import { TRPCReactProvider } from "@/lib/trpc/react";
import { BuyerShell } from "@/components/buyer/buyer-shell";

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.BUYER]: "Buyer",
  [UserRole.SOCIETY_ADMIN]: "Society admin",
  [UserRole.DEALER_PARTNER]: "Dealer partner",
  [UserRole.SALES_ADVISOR]: "Sales advisor",
  [UserRole.SUPER_ADMIN]: "Platform admin",
};

/**
 * The authenticated buyer portal. `middleware.ts` is the real gate; this layout
 * re-checks the session as defence in depth and provides the shell + tRPC client
 * provider for the interactive client components beneath it (the booking wizard).
 */
export default async function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }
  // A wrong-role user who slips past middleware is sent to their own portal.
  if (session.user.role !== undefined && session.user.role !== UserRole.BUYER) {
    redirect(homeForRole(session.user.role));
  }

  return (
    <TRPCReactProvider>
      <BuyerShell
        conciergeMode={isConciergeMode()}
        user={{
          name: session.user.name ?? "Your account",
          roleLabel: ROLE_LABEL[UserRole.BUYER],
        }}
      >
        {children}
      </BuyerShell>
    </TRPCReactProvider>
  );
}

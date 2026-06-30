import { redirect } from "next/navigation";
import { UserRole } from "@sectoria/types";
import { auth } from "@/auth";
import { homeForRole } from "@/lib/auth/roles";
import { OpsShell } from "@/components/ops/ops-shell";
import { TRPCReactProvider } from "@/lib/trpc/react";

const OPS_ROLES = new Set<UserRole>([
  UserRole.SALES_ADVISOR,
  UserRole.SUPER_ADMIN,
]);

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/ops-portal");
  }
  if (!OPS_ROLES.has(session.user.role as UserRole)) {
    redirect(homeForRole(session.user.role));
  }

  return (
    <TRPCReactProvider>
      <OpsShell
        user={{
          name: session.user.name ?? "Advisor",
          roleLabel:
            session.user.role === UserRole.SUPER_ADMIN
              ? "Platform admin"
              : "Sales advisor",
        }}
      >
        {children}
      </OpsShell>
    </TRPCReactProvider>
  );
}

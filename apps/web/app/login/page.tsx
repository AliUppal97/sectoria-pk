import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, DEV_OTP_CODE } from "@/auth";
import { homeForRole } from "@/lib/auth/roles";
import { listDemoBuyers, listDemoDealers, listDemoSocietyAdmins } from "@/lib/auth/demo-accounts";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Sectoria account with your phone number.",
  robots: { index: false, follow: false },
};

/** Known authenticated portal callback paths (open-redirect safe). */
const SAFE_CALLBACKS = ["/dashboard", "/society-portal", "/dealer-portal", "/admin"];

function resolveCallbackUrl(raw: string | undefined): string {
  // Only accept internal, known-prefix paths to avoid open-redirects.
  if (raw && raw.startsWith("/") && SAFE_CALLBACKS.some((p) => raw.startsWith(p))) {
    return raw;
  }
  return "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect(homeForRole(session.user.role));
  }

  const { callbackUrl } = await searchParams;
  const [demoBuyers, demoSocietyAdmins, demoDealers] = await Promise.all([
    listDemoBuyers(),
    listDemoSocietyAdmins(),
    listDemoDealers(),
  ]);
  const demoAccounts = [
    ...demoDealers.slice(0, 3),
    ...demoSocietyAdmins.slice(0, 2),
    ...demoBuyers.slice(0, 4),
  ];
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="flex min-h-dvh flex-col bg-surface-base">
      <header className="px-4 py-5 sm:px-8">
        <Link
          href="/"
          className="font-sans text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
        >
          ← Back to Sectoria
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <LoginForm
          callbackUrl={resolveCallbackUrl(callbackUrl)}
          demoAccounts={demoAccounts}
          {...(isDev ? { devOtp: DEV_OTP_CODE } : {})}
        />
      </main>
    </div>
  );
}

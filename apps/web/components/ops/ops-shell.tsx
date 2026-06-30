"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Table,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@sectoria/ui";
import { useIsClient } from "@/lib/use-is-client";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/ops-portal", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/ops-portal/leads", label: "Leads", icon: ClipboardList },
  { href: "/ops-portal/pricing", label: "Margin matrix", icon: Table },
  { href: "/ops-portal/fulfillment", label: "Fulfillment", icon: PlusCircle },
];

export function OpsShell({
  user,
  children,
}: {
  user: { name: string; roleLabel: string };
  children: ReactNode;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-surface-base">
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col bg-brand-navy md:flex md:w-16 lg:w-55">
        <SidebarContent user={user} />
      </aside>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-brand-navy/50 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-brand-navy">
            <SidebarContent user={user} onNavigate={() => setIsDrawerOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border-base bg-surface-card px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open navigation"
            className="rounded-md p-2 text-text-secondary hover:bg-surface-subtle"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-sans text-sm font-semibold text-text-primary">
            Ops CRM
          </span>
        </header>
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  user,
  onNavigate,
}: {
  user: { name: string; roleLabel: string };
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isClient = useIsClient();

  return (
    <>
      <div className="border-b border-text-inverse/10 px-4 py-5 lg:px-5">
        <Link href="/" className="block">
          <span className="font-sans text-base font-bold leading-none text-text-inverse">
            Sectoria
          </span>
          <span className="mt-1 block font-sans text-2xs text-text-inverse/50 lg:hidden">
            Ops
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm transition-colors",
                active
                  ? "bg-text-inverse/10 text-text-inverse"
                  : "text-text-inverse/70 hover:bg-text-inverse/5 hover:text-text-inverse",
              )}
            >
              <item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-text-inverse/10 px-4 py-4 lg:px-5">
        <p className="truncate font-sans text-sm font-medium text-text-inverse">
          {user.name}
        </p>
        <p className="font-sans text-2xs text-text-inverse/50">{user.roleLabel}</p>
        {isClient ? (
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/" })}
            className="mt-3 flex items-center gap-2 font-sans text-xs text-text-inverse/60 hover:text-text-inverse"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        ) : null}
      </div>
    </>
  );
}

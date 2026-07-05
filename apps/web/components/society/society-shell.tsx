"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Building2,
  ClipboardList,
  FileText,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Megaphone,
  Package,
  Settings,
  Sparkles,
  Route,
  Users,
  X,
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
  {
    href: "/society-portal",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  { href: "/society-portal/profile", label: "Profile", icon: Sparkles },
  { href: "/society-portal/media", label: "Media", icon: ImageIcon },
  { href: "/society-portal/documents", label: "Documents", icon: FileText },
  { href: "/society-portal/amenities", label: "Amenities", icon: MapPin },
  { href: "/society-portal/roadmap", label: "Roadmap", icon: Route },
  { href: "/society-portal/inventory", label: "Inventory", icon: Package },
  { href: "/society-portal/updates", label: "Updates", icon: Megaphone },
  { href: "/society-portal/partners", label: "Partners", icon: Users },
  {
    href: "/society-portal/bookings",
    label: "Bookings",
    icon: ClipboardList,
  },
  { href: "/society-portal/settings", label: "Settings", icon: Settings },
];

interface SocietyShellUser {
  name: string;
  roleLabel: string;
  societyName: string;
}

/**
 * Society-admin portal chrome — same responsive sidebar behaviour as the buyer
 * shell (hamburger < 768px, icon-only 768–1024px, full labels > 1024px).
 */
export function SocietyShell({
  user,
  children,
}: {
  user: SocietyShellUser;
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
            <div className="flex justify-end p-3">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close navigation"
                className="rounded-md p-1.5 text-text-inverse/70 transition-colors hover:bg-text-inverse/10 hover:text-text-inverse"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent
              user={user}
              forceLabels
              onNavigate={() => setIsDrawerOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border-base bg-surface-card px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open navigation"
            className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface-subtle"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <span className="font-sans text-sm font-bold text-text-primary">
            {user.societyName}
          </span>
        </header>

        <main className="mx-auto w-full max-w-[1024px] flex-1 px-4 py-6 lg:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  user,
  forceLabels = false,
  onNavigate,
}: {
  user: SocietyShellUser;
  forceLabels?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isClient = useIsClient();

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-text-inverse/8 px-4 pb-4 pt-5",
          !forceLabels && "md:justify-center lg:justify-start",
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-navy-mid font-sans text-base font-bold text-text-inverse"
        >
          S
        </span>
        <span className={cn("flex flex-col", !forceLabels && "md:hidden lg:flex")}>
          <span className="font-sans text-base font-bold leading-none text-text-inverse">
            Sectoria
          </span>
          <span className="mt-1 truncate font-sans text-3xs uppercase tracking-[0.05em] text-text-inverse/40">
            {user.societyName}
          </span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              isClient &&
              (item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  title={item.label}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2.25 font-sans text-sm font-medium transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-light",
                    isActive
                      ? "bg-brand-navy-mid text-text-inverse"
                      : "text-text-inverse/55 hover:bg-text-inverse/7 hover:text-text-inverse/85",
                    !forceLabels && "md:justify-center lg:justify-start",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0"
                    strokeWidth={2}
                  />
                  <span className={cn(!forceLabels && "md:hidden lg:inline")}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-text-inverse/8 p-2.5">
        <div
          className={cn(
            "mb-2 rounded-md bg-text-inverse/6 px-2.5 py-2",
            !forceLabels && "md:hidden lg:block",
          )}
        >
          <p className="truncate font-sans text-xs font-semibold text-text-inverse">
            {user.name}
          </p>
          <p className="font-sans text-3xs uppercase tracking-[0.05em] text-text-inverse/40">
            {user.roleLabel}
          </p>
        </div>
        <Link
          href="/societies"
          onClick={onNavigate}
          title="Public profile"
          className={cn(
            "mb-1 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.25 font-sans text-sm font-medium text-text-inverse/55 transition-colors hover:bg-text-inverse/7 hover:text-text-inverse/85",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-light",
            !forceLabels && "md:justify-center lg:justify-start",
          )}
        >
          <Building2 aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className={cn(!forceLabels && "md:hidden lg:inline")}>
            Public profile
          </span>
        </Link>
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: "/" })}
          title="Sign out"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.25 font-sans text-sm font-medium text-text-inverse/55 transition-colors hover:bg-text-inverse/7 hover:text-text-inverse/85",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-light",
            !forceLabels && "md:justify-center lg:justify-start",
          )}
        >
          <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className={cn(!forceLabels && "md:hidden lg:inline")}>
            Sign out
          </span>
        </button>
      </div>
    </>
  );
}

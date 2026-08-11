"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLockup, BrandMark } from "@/components/ui/BrandLockup";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationsMenu } from "@/components/workspace/NotificationsMenu";
import { IncidentBanner } from "@/components/IncidentBanner";
import {
  getNavItems,
  ADMIN_CONSOLE_ITEMS,
  type WorkspaceRole,
} from "@/components/workspace/nav-config";
import {
  getPortalMode,
  setPortalMode,
  type PortalMode,
} from "@/lib/portal-mode";
import { LogOut, Menu, UserRound, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

function SidebarContent({
  profile,
  navItems,
  pathname,
  sidebarCollapsed = false,
  isMobile = false,
  onSignOut,
  onClose,
  showPortalSwitch = false,
  onSwitchToUserPortal,
}: {
  profile: any;
  navItems: ReturnType<typeof getNavItems>;
  pathname: string;
  sidebarCollapsed?: boolean;
  isMobile?: boolean;
  onSignOut: () => void;
  onClose?: () => void;
  showPortalSwitch?: boolean;
  onSwitchToUserPortal?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex items-center border-b border-[var(--line)]",
          isMobile || !sidebarCollapsed ? "px-5 py-4" : "justify-center px-2 py-4"
        )}
      >
        <Link href="/dashboard" className="flex items-center">
          {sidebarCollapsed && !isMobile ? (
            <BrandMark size={30} />
          ) : (
            <BrandLockup compact={isMobile} />
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                sidebarCollapsed && !isMobile && "justify-center px-2",
                active
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              )}
              title={sidebarCollapsed && !isMobile ? item.label : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--brand)]" />
              )}
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {(!sidebarCollapsed || isMobile) && <span>{item.label}</span>}
            </Link>
          );
        })}
        {showPortalSwitch && (
          <button
            type="button"
            onClick={onSwitchToUserPortal}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>View user portal</span>
          </button>
        )}
      </nav>

      <div className="border-t border-[var(--line)] p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl px-2 py-2",
            sidebarCollapsed && !isMobile && "justify-center"
          )}
        >
          {profile ? (
            <>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] font-display text-xs font-bold text-[var(--brand-ink)]">
                {profile.display_name?.slice(0, 1) || "U"}
              </span>
              {(!sidebarCollapsed || isMobile) && <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-xs font-semibold text-[var(--ink)]">
                {profile.display_name || "AI Department"}
              </span>
              <span className="block truncate font-mono text-[10px] text-[var(--muted)]">
                {profile.role === "super_admin"
                    ? "Super Admin"
                    : profile.role === "admin"
                    ? "Admin"
                    : profile.user_type === "intern"
                    ? "Intern"
                    : "Staff"}
              </span>
              </span>}
            </>
          ) : (!sidebarCollapsed || isMobile) ? (
            <PageSkeleton variant="profile" />
          ) : (
            <span className="skeleton-block h-8 w-8 shrink-0" aria-label="Loading profile" role="status" />
          )}
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [portalMode, setPortalModeState] = useState<PortalMode>("admin");

  useEffect(() => {
    setPortalModeState(getPortalMode());
  }, [pathname]);

  useEffect(() => {
    const getProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("id, display_name, user_type, department, role, account_status")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);
      }
    };
    getProfile();
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const role = (profile?.role as WorkspaceRole) || "employee";
  const isAdmin = role === "admin" || role === "super_admin";
  const navItems =
    isAdmin && portalMode === "admin"
      ? ADMIN_CONSOLE_ITEMS
      : getNavItems(role);

  const switchToUserPortal = () => {
    setPortalMode("user");
    setPortalModeState("user");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-[var(--line)] bg-[var(--workspace)] transition-[width] duration-200 lg:block",
          sidebarCollapsed ? "w-[76px]" : "w-[248px]"
        )}
      >
        <SidebarContent
          profile={profile}
          navItems={navItems}
          pathname={pathname}
          sidebarCollapsed={sidebarCollapsed}
          onSignOut={handleSignOut}
          showPortalSwitch={isAdmin && portalMode === "admin"}
          onSwitchToUserPortal={switchToUserPortal}
        />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/45"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[290px] border-r border-[var(--line)] bg-[var(--workspace)] shadow-[var(--shadow-lg)]">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-3)]"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent
              profile={profile}
              navItems={navItems}
              pathname={pathname}
              isMobile
              onSignOut={handleSignOut}
              onClose={() => setDrawerOpen(false)}
              showPortalSwitch={isAdmin && portalMode === "admin"}
              onSwitchToUserPortal={switchToUserPortal}
            />
          </aside>
        </div>
      )}

      {/* Top bar (mobile/tablet) */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--line)] bg-[var(--workspace)]/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          className="topbar-action"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link href="/dashboard" className="mr-auto">
          <BrandMark size={28} />
        </Link>
        <ThemeToggle />
        <NotificationsMenu />
      </header>

      {/* Desktop top actions */}
      <div
        className={cn(
          "fixed right-5 top-4 z-30 hidden items-center gap-3 lg:flex",
          sidebarCollapsed ? "right-5" : "right-6"
        )}
      >
        <ThemeToggle />
        <NotificationsMenu />
      </div>

      {/* Desktop collapse toggle */}
      <button
        type="button"
        onClick={() => setSidebarCollapsed((v) => !v)}
        aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
        className={cn(
          "fixed left-3 top-4 z-30 hidden h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition lg:inline-flex",
          sidebarCollapsed ? "translate-x-[44px]" : "translate-x-[204px]"
        )}
      >
        {sidebarCollapsed ? (
          <Menu className="h-3.5 w-3.5" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
      </button>

      <main
        className={cn(
          "min-h-screen px-4 pb-20 pt-6 sm:px-6 lg:pt-20",
          sidebarCollapsed ? "lg:pl-[100px]" : "lg:pl-[272px]"
        )}
      >
        <div className="mx-auto w-full max-w-6xl">
          <IncidentBanner canManage={isAdmin} />
          {children}
        </div>
      </main>
    </div>
  );
}

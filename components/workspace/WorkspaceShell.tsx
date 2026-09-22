"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLockup, BrandMark } from "@/components/ui/BrandLockup";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationsMenu } from "@/components/workspace/NotificationsMenu";
import { IncidentBanner } from "@/components/IncidentBanner";
import {
  getNavItems,
  getActiveNavHref,
  ADMIN_CONSOLE_ITEMS,
  type WorkspaceRole,
} from "@/components/workspace/nav-config";
import {
  getPortalMode,
  isAdminPortalPath,
  setPortalMode,
  type PortalMode,
} from "@/lib/portal-mode";
import { LogOut, Menu, UserRound, X, ChevronLeft, ChevronRight } from "lucide-react";
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
  onNavigate,
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
  onNavigate?: (href: string) => void;
  showPortalSwitch?: boolean;
  onSwitchToUserPortal?: () => void;
}) {
  const activeHref = getActiveNavHref(pathname, navItems);

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "workspace-brand flex items-center",
          isMobile || !sidebarCollapsed ? "px-5 py-4" : "justify-center px-2 py-4"
        )}
      >
        <Link href="/dashboard" aria-label="Workspace overview" className="flex items-center">
          {sidebarCollapsed && !isMobile ? (
            <BrandMark size={30} />
          ) : (
            <BrandLockup compact={isMobile} />
          )}
        </Link>
      </div>

      <nav aria-label="Workspace" className="workspace-navigation flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {(!sidebarCollapsed || isMobile) && <p className="workspace-nav-label">{showPortalSwitch ? "Administration" : "Workspace"}</p>}
        {navItems.map((item) => {
          const active = activeHref === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              aria-current={active ? "page" : undefined}
              href={item.href}
              onClick={() => {
                onNavigate?.(item.href);
                onClose?.();
              }}
              className={cn(
                "workspace-nav-item group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                sidebarCollapsed && !isMobile && "justify-center px-2",
                active
                  ? "workspace-nav-active bg-[var(--brand-soft)] text-[var(--brand-ink)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              )}
              title={sidebarCollapsed && !isMobile ? item.label : undefined}
            >

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

      <div className="workspace-profile border-t border-[var(--line)] p-3">
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
  const drawerRef = useRef<HTMLElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isAdminPortalPath(pathname)) {
      setPortalMode("admin");
      setPortalModeState("admin");
      return;
    }
    setPortalModeState(getPortalMode());
  }, [pathname]);

  useEffect(() => {
    const getProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, display_name, user_type, department, role, account_status")
          .eq("id", user.id)
          .maybeSingle();
        if (!profileError && !data) {
          router.replace(`/onboarding?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }
        if (data) setProfile(data);
      }
    };
    getProfile();
  }, [router]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    const drawerTrigger = drawerTriggerRef.current;
    document.body.style.overflow = "hidden";
    const drawer = drawerRef.current;
    drawer?.querySelector<HTMLElement>("button, a[href]")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawer) return;
      const focusables = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      drawerTrigger?.focus();
    };
  }, [drawerOpen]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/login");
    router.refresh();
  };

  const role = (profile?.role as WorkspaceRole) || "employee";
  const isAdmin = role === "admin" || role === "super_admin";
  const navItems =
    isAdmin && portalMode === "admin"
      ? ADMIN_CONSOLE_ITEMS
      : getNavItems(role);

  const handleNavigate = (href: string) => {
    if (isAdminPortalPath(href)) {
      setPortalMode("admin");
      setPortalModeState("admin");
    }
  };

  const switchToUserPortal = () => {
    setPortalMode("user");
    setPortalModeState("user");
    router.push("/dashboard");
  };

  const activeNav = navItems.find(item => item.href === getActiveNavHref(pathname, navItems));

  return (
    <div className={cn("workspace", sidebarCollapsed && "workspace--collapsed")}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "workspace-sidebar fixed inset-y-0 left-0 z-40 hidden border-r border-[var(--line)] bg-[var(--workspace)] transition-[width] duration-200 lg:block",
          sidebarCollapsed ? "w-[76px]" : "w-[232px]"
        )}
      >
        <SidebarContent
          profile={profile}
          navItems={navItems}
          pathname={pathname}
          sidebarCollapsed={sidebarCollapsed}
          onSignOut={handleSignOut}
          onNavigate={handleNavigate}
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
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation"
            className="absolute inset-y-0 left-0 w-[min(290px,calc(100vw-3rem))] border-r border-[var(--line)] bg-[var(--workspace)] shadow-[var(--shadow-lg)]"
          >
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="safe-area-top absolute right-2 top-0 inline-flex h-14 w-11 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-3)]"
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
              onNavigate={handleNavigate}
              showPortalSwitch={isAdmin && portalMode === "admin"}
              onSwitchToUserPortal={switchToUserPortal}
            />
          </aside>
        </div>
      )}

      {/* Top bar (mobile/tablet) */}
      <header className="workspace-mobile-bar safe-area-top sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--line)] bg-[var(--workspace)]/90 px-4 pb-3 backdrop-blur lg:hidden">
        <button
          ref={drawerTriggerRef}
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          className="topbar-action"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link href="/dashboard" aria-label="Workspace overview" className="mr-auto">
          <BrandMark size={28} />
        </Link>
        <ThemeToggle />
        <NotificationsMenu />
      </header>

      <header className="workspace-topbar">
        <div className="workspace-breadcrumb" aria-label="Breadcrumb">
          <Link href="/dashboard">AI desk</Link><span>/</span>
          <span>{activeNav?.label || (pathname.startsWith("/tickets/") ? "Ticket details" : "Overview")}</span>
        </div>
        <div className="workspace-topbar-actions">
          <span className="workspace-access-label">{isAdmin && portalMode === "admin" ? "Admin workspace" : "Staff workspace"}</span>
          <ThemeToggle /><NotificationsMenu />
          <span className="workspace-avatar" title={profile?.display_name || "Your account"}>{profile?.display_name?.slice(0, 1)?.toUpperCase() || "U"}</span>
        </div>
      </header>
      <button
        type="button"
        onClick={() => setSidebarCollapsed(v => !v)}
        aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
        aria-expanded={!sidebarCollapsed}
        className="workspace-collapse"
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <main
        className={cn(
          "workspace-main min-h-screen",
          sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[232px]"
        )}
      >
        <div className="workspace-content">
          <IncidentBanner canManage={isAdmin} />
          {children}
        </div>
      </main>
    </div>
  );
}

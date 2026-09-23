import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  BookOpen,
  BarChart3,
  Radio,
  KeyRound,
  Users,
  TicketCheck,
  MessageSquareText,
  Library,
  ShieldCheck,
  ArchiveRestore,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceRole } from "@/lib/admin/types";

export type { WorkspaceRole } from "@/lib/admin/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  roles: WorkspaceRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    group: "Workspace",
    icon: LayoutDashboard,
    roles: ["employee", "admin", "super_admin"],
  },
  {
    href: "/tickets",
    label: "All tickets",
    group: "Requests",
    icon: Ticket,
    roles: ["employee", "admin", "super_admin"],
  },
  {
    href: "/tickets/new",
    label: "New ticket",
    group: "Requests",
    icon: PlusCircle,
    roles: ["employee", "admin", "super_admin"],
  },
  {
    href: "/faq",
    label: "Help & guides",
    group: "Resources",
    icon: BookOpen,
    roles: ["employee", "admin", "super_admin"],
  },
  {
    href: "/admin/dashboard",
    label: "Admin console",
    group: "Administration",
    icon: BarChart3,
    roles: ["admin", "super_admin"],
  },
];

export const ADMIN_CONSOLE_ITEMS: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    group: "Overview",
    icon: BarChart3,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/tickets",
    label: "Ticket queue",
    group: "Service desk",
    icon: TicketCheck,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/comments",
    label: "Conversations",
    group: "Service desk",
    icon: MessageSquareText,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/knowledge",
    label: "Knowledge & routing",
    group: "Configuration",
    icon: Library,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/incidents",
    label: "Service incidents",
    group: "Service desk",
    icon: Radio,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/api-clients",
    label: "API integrations",
    group: "Configuration",
    icon: KeyRound,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/staff",
    label: "Staff accounts",
    group: "People & access",
    icon: Users,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/admin-management",
    label: "Administrators",
    group: "People & access",
    icon: ShieldCheck,
    roles: ["super_admin"],
  },
  {
    href: "/admin/recycle-bin",
    label: "Deleted records",
    group: "System",
    icon: ArchiveRestore,
    roles: ["super_admin"],
  },
  {
    href: "/admin/system-logs",
    label: "Audit logs",
    group: "System",
    icon: ScrollText,
    roles: ["super_admin"],
  },
];

export function getNavItems(role: WorkspaceRole | null | undefined) {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/**
 * Returns the href of the nav item that best matches the current pathname.
 * When several items match (e.g. "/tickets" and "/tickets/new" on
 * "/tickets/new"), the most specific one — the longest href — wins, so at
 * most one item is ever highlighted.
 */
export function getActiveNavHref(
  pathname: string,
  items: Pick<NavItem, "href">[]
): string | null {
  let activeHref: string | null = null;
  for (const item of items) {
    const href = item.href;
    const normalized = href.endsWith("/") ? href.slice(0, -1) : href;
    const matches =
      pathname === href ||
      (normalized.length > 0 && pathname.startsWith(normalized + "/"));
    if (matches && (activeHref === null || href.length > activeHref.length)) {
      activeHref = href;
    }
  }
  return activeHref;
}

export function groupNavItems(items: NavItem[]) {
  const groups = new Map<string, NavItem[]>();
  for (const item of items) {
    const entries = groups.get(item.group) ?? [];
    entries.push(item);
    groups.set(item.group, entries);
  }
  return Array.from(groups, ([label, items]) => ({ label, items }));
}

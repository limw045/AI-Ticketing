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
  roles: WorkspaceRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    roles: ["employee", "admin", "super_admin"],
  },
  {
    href: "/tickets",
    label: "Tickets",
    icon: Ticket,
    roles: ["employee", "admin", "super_admin"],
  },
  {
    href: "/tickets/new",
    label: "Create ticket",
    icon: PlusCircle,
    roles: ["employee", "admin", "super_admin"],
  },
  {
    href: "/faq",
    label: "Knowledge",
    icon: BookOpen,
    roles: ["employee", "admin", "super_admin"],
  },
  {
    href: "/admin/dashboard",
    label: "Analytics",
    icon: BarChart3,
    roles: ["admin", "super_admin"],
  },
];

export const ADMIN_CONSOLE_ITEMS: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Operations",
    icon: BarChart3,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/tickets",
    label: "Tickets",
    icon: TicketCheck,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/comments",
    label: "Comments",
    icon: MessageSquareText,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/knowledge",
    label: "Knowledge",
    icon: Library,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/incidents",
    label: "Incidents",
    icon: Radio,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/api-clients",
    label: "API clients",
    icon: KeyRound,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/staff",
    label: "Staff",
    icon: Users,
    roles: ["admin", "super_admin"],
  },
  {
    href: "/admin/admin-management",
    label: "Admin management",
    icon: ShieldCheck,
    roles: ["super_admin"],
  },
  {
    href: "/admin/recycle-bin",
    label: "Recycle bin",
    icon: ArchiveRestore,
    roles: ["super_admin"],
  },
  {
    href: "/admin/system-logs",
    label: "System logs",
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

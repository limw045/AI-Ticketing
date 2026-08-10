import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  BookOpen,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type WorkspaceRole = "employee" | "support_agent" | "admin";

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
    roles: ["employee", "support_agent", "admin"],
  },
  {
    href: "/tickets",
    label: "Tickets",
    icon: Ticket,
    roles: ["employee", "support_agent", "admin"],
  },
  {
    href: "/tickets/new",
    label: "Create ticket",
    icon: PlusCircle,
    roles: ["employee", "support_agent", "admin"],
  },
  {
    href: "/faq",
    label: "Knowledge",
    icon: BookOpen,
    roles: ["employee", "support_agent", "admin"],
  },
  {
    href: "/admin/dashboard",
    label: "Analytics",
    icon: BarChart3,
    roles: ["support_agent", "admin"],
  },
];

export function getNavItems(role: WorkspaceRole | null | undefined) {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

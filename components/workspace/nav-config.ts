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

export const ADMIN_CONSOLE_ITEMS: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Operations",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    href: "/admin/tickets",
    label: "Tickets",
    icon: TicketCheck,
    roles: ["admin"],
  },
  {
    href: "/admin/incidents",
    label: "Incidents",
    icon: Radio,
    roles: ["admin"],
  },
  {
    href: "/admin/api-clients",
    label: "API clients",
    icon: KeyRound,
    roles: ["admin"],
  },
  {
    href: "/admin/staff",
    label: "Staff",
    icon: Users,
    roles: ["admin"],
  },
];

export function getNavItems(role: WorkspaceRole | null | undefined) {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

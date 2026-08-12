"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buildCsv } from "@/lib/csv";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge, severityTone } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/FormField";
import { setPortalMode } from "@/lib/portal-mode";
import { ticketStatusLabel } from "@/lib/display-labels";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import {
  Download,
  Radio,
  KeyRound,
  Users,
  TicketCheck,
  ArrowRight,
  MessageSquareText,
  Library,
  ShieldCheck,
  ArchiveRestore,
  ScrollText,
} from "lucide-react";

export default function AdminDashboard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [viewerRole, setViewerRole] = useState("admin");
  const [error, setError] = useState("");

  const fetchDashboardData = async () => {
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role) setViewerRole(profile.role);
    }
    const { data: ticketData, error: ticketError } = await supabase
      .from("tickets")
      .select("*, author:profiles!tickets_author_id_fkey(*)")
      .is("deleted_at", null);
    if (ticketError) setError(`Could not load dashboard tickets: ${ticketError.message}`);
    else setTickets(ticketData ?? []);

    const { data: incidentData, error: incidentError } = await supabase
      .from("incidents")
      .select("*")
      .order("created_at", { ascending: false });
    if (incidentError) setError(`Could not load incidents: ${incidentError.message}`);
    else setIncidents(incidentData ?? []);
  };

  useEffect(() => {
    setPortalMode("admin");
    fetchDashboardData();
  }, []);

  const exportCSV = () => {
    if (tickets.length === 0) return;
    const headers = [
      "Ticket Number",
      "Title",
      "Category",
      "Priority",
      "Status",
      "Author",
      "Created At",
    ];
    const rows = tickets.map((t) => [
      t.ticket_number,
      t.title,
      t.category,
      t.priority,
      t.status,
      t.author?.display_name || "Unknown",
      t.created_at,
    ]);

    const csvBlob = new Blob([buildCsv([headers, ...rows])], {
      type: "text/csv;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");
    link.setAttribute("href", objectUrl);
    link.setAttribute(
      "download",
      `IT_Ticketing_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const totalVolume = tickets.length;
  const resolvedTickets = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  ).length;
  const resolutionRate =
    totalVolume > 0 ? Math.round((resolvedTickets / totalVolume) * 100) : 0;
  const urgentCount = tickets.filter(
    (t) => t.priority === "urgent" && t.status !== "closed"
  ).length;
  const activeIncidents = incidents.filter((i) => i.is_active).length;
  const respondedTickets = tickets.filter(
    (ticket) => ticket.first_responded_at && ticket.created_at
  );
  const averageResponseHours = respondedTickets.length
    ? respondedTickets.reduce((sum, ticket) => {
        const elapsedMs =
          new Date(ticket.first_responded_at).getTime() -
          new Date(ticket.created_at).getTime();
        return sum + Math.max(0, elapsedMs / 3_600_000);
      }, 0) / respondedTickets.length
    : null;

  const quickLinks = [
    {
      href: "/admin/tickets",
      label: "Tickets",
      description: "View, edit, and soft-delete every request.",
      icon: TicketCheck,
      badge: `${totalVolume} total`,
    },
    {
      href: "/admin/incidents",
      label: "Incidents",
      description: "Publish, edit, and remove outage banners.",
      icon: Radio,
      badge: `${activeIncidents} active`,
    },
    {
      href: "/admin/comments",
      label: "Comments",
      description: "Moderate replies and internal notes across tickets.",
      icon: MessageSquareText,
      badge: "Discussion",
    },
    {
      href: "/admin/knowledge",
      label: "Knowledge",
      description: "Manage FAQs and request routing rules.",
      icon: Library,
      badge: "Content",
    },
    {
      href: "/admin/api-clients",
      label: "API clients",
      description: "Generate keys and manage internal app access.",
      icon: KeyRound,
      badge: "Keys",
    },
    {
      href: "/admin/staff",
      label: "Staff",
      description: "Manage roles and account status.",
      icon: Users,
      badge: "Access",
    },
    ...(viewerRole === "super_admin"
      ? [
          {
            href: "/admin/admin-management",
            label: "Admin management",
            description: "Promote, demote, suspend, or restore administrators.",
            icon: ShieldCheck,
            badge: "Super Admin",
          },
          {
            href: "/admin/recycle-bin",
            label: "Recycle bin",
            description: "Restore deleted business records across modules.",
            icon: ArchiveRestore,
            badge: "Recovery",
          },
          {
            href: "/admin/system-logs",
            label: "System logs",
            description: "Review immutable activity, API, and notification logs.",
            icon: ScrollText,
            badge: "Read only",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-10">
      {error && (
        <Alert tone="error" role="alert">
          {error}
        </Alert>
      )}

      <PageHeader
        eyebrow="Operations"
        title="The signal behind the queue."
        description="Service desk metrics, category breakdown, and global incident management."
        actions={
          <Button type="button" variant="secondary" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export CSV report
          </Button>
        }
      />

      {activeIncidents > 0 && (
        <Alert tone="warning" role="alert">
          <strong className="block">
            {activeIncidents} active incident
            {activeIncidents > 1 ? "s" : ""}
          </strong>
          <Link
            href="/admin/incidents"
            className="mt-1 inline-flex items-center gap-1 text-sm font-semibold underline"
          >
            Manage in Incidents <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total volume"
          value={totalVolume}
          animate
          hint="Requests across all departments"
        />
        <MetricCard
          label="Resolution rate"
          value={`${resolutionRate}%`}
          valueClassName="text-[var(--success)]"
          hint="Resolved or closed of all time"
        />
        <MetricCard
          label="Avg response SLA"
          value={
            averageResponseHours === null
              ? "N/A"
              : `${averageResponseHours.toFixed(1)}h`
          }
          valueClassName="text-[var(--brand-ink)]"
          hint="First reply after creation"
        />
        <MetricCard
          label="Urgent breaches"
          value={urgentCount}
          animate
          valueClassName="text-[var(--danger)]"
          hint="P0 tickets still open"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group surface flex items-start justify-between gap-4 p-6 transition hover:border-[var(--line-strong)]"
            >
              <div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-soft)]">
                  <Icon className="h-4 w-4 text-[var(--brand-ink)]" />
                </span>
                <h2 className="mt-4 font-display text-base font-bold">
                  {link.label}
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  {link.description}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge tone="brand">{link.badge}</StatusBadge>
                <ArrowRight className="h-4 w-4 text-[var(--faint)] transition group-hover:text-[var(--brand-ink)]" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <DashboardCharts tickets={tickets} />
      </div>

      <section className="surface">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <div>
            <h2 className="font-display text-base font-bold">
              Latest requests
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              The most recent tickets across the desk
            </p>
          </div>
          <Link
            href="/admin/tickets"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-ink)] hover:text-[var(--brand)]"
          >
            Open tickets table <ArrowRight className="h-4 w-4" />
          </Link>
        </header>
        <div className="p-6">
          {tickets.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--faint)]">
              No tickets yet — the latest requests will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {tickets.slice(0, 6).map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`/admin/tickets`}
                    className="flex items-center gap-4 py-3.5 transition hover:bg-[var(--surface-2)]"
                  >
                    <span className="font-mono text-xs font-semibold text-[var(--faint)]">
                      #{ticket.ticket_number}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ink)]">
                      {ticket.title}
                    </span>
                    <span className="hidden font-mono text-xs text-[var(--muted)] sm:block">
                      {ticket.author?.display_name}
                    </span>
                    <StatusBadge tone={severityTone(ticket.status)}>
                      {ticketStatusLabel(ticket.status)}
                    </StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

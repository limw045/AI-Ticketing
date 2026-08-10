"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge, statusTone } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/FormField";
import { getRoleHomeMetrics } from "@/lib/dashboard-metrics";
import { getPortalMode, type PortalMode } from "@/lib/portal-mode";
import {
  Clock,
  CheckCircle2,
  TriangleAlert,
  Inbox,
  Users,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [portalMode, setPortalModeState] = useState<PortalMode>("admin");

  useEffect(() => {
    setPortalModeState(getPortalMode());
  }, []);

  useEffect(() => {
    const load = async () => {
      setError("");
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace("/login");
        return;
      }
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, user_type, department, role, account_status")
        .eq("id", user.id)
        .single();
      if (profileError || !profileData || profileData.account_status !== "active") {
        setError(
          profileError?.message ||
            "Your staff profile is unavailable or inactive."
        );
        setLoading(false);
        return;
      }
      setProfile(profileData);

      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .select(
          "*, author:profiles!tickets_author_id_fkey(id, display_name, department, user_type), assignee:profiles!tickets_assignee_id_fkey(id, display_name, department)"
        )
        .order("created_at", { ascending: false });
      if (ticketError) setError(`Could not load tickets: ${ticketError.message}`);
      else setTickets(ticketData ?? []);

      const { data: incidentData, error: incidentError } = await supabase
        .from("incidents")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (incidentError) setError(`Could not load incidents: ${incidentError.message}`);
      else setIncidents(incidentData ?? []);
      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="py-24 text-center font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
        Loading your overview…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10">
        <Alert tone="error" role="alert">
          {error}
        </Alert>
      </div>
    );
  }

  const role = profile?.role || "employee";
  const viewRole =
    role === "admin" && portalMode === "user" ? "employee" : role;
  const m = getRoleHomeMetrics(tickets, profile?.id);
  const recent = tickets.slice(0, 5);
  const myRecent = tickets
    .filter((t) => t.author_id === profile?.id)
    .slice(0, 5);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Grant Thornton · AI Department"
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${profile?.display_name?.split(" ")[0] || "there"}.`}
        description={
          viewRole === "admin"
            ? "Service desk health, staff access, and the queue behind the numbers."
            : viewRole === "support_agent"
            ? "The queue waiting on your team, and what needs attention first."
            : "Your requests, and answers worth reading before you open a new one."
        }
        actions={
          <Link href="/tickets/new">
            <Button>New ticket</Button>
          </Link>
        }
      />

      {incidents.length > 0 && (
        <Alert tone="warning" role="alert">
          <strong className="block">{incidents[0].title}</strong>
          <span className="mt-0.5 block text-[var(--warning)]/85">
            {incidents[0].message}
          </span>
        </Alert>
      )}

      {role === "admin" && portalMode === "user" && (
        <Alert tone="info">
          <strong className="block">You&apos;re viewing the user portal.</strong>
          <span className="mt-0.5 block opacity-85">
            Submit and follow your own requests here. Switch back to the admin
            console anytime.
          </span>
          <Link
            href="/admin/dashboard"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline"
          >
            <LayoutDashboard className="h-4 w-4" /> Open admin console
          </Link>
        </Alert>
      )}

      {viewRole === "employee" && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Open requests"
              value={m.myOpenCount}
              animate
              icon={<Inbox className="h-4 w-4" />}
            />
            <MetricCard
              label="In progress"
              value={m.waitingOnCount}
              animate
              icon={<Clock className="h-4 w-4" />}
            />
            <MetricCard
              label="Resolution rate"
              value={`${m.resolutionRate}%`}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
          </section>

          <section className="surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Your recent requests</h2>
              <Link
                href="/tickets?mine=1"
                className="text-sm font-semibold text-[var(--brand-ink)] hover:text-[var(--brand)]"
              >
                View all
              </Link>
            </div>
            {myRecent.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--muted)]">
                You haven&apos;t opened any requests yet.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {myRecent.map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="flex items-center gap-4 py-3.5 transition hover:bg-[var(--surface-2)]"
                    >
                      <span className="font-mono text-xs font-semibold text-[var(--faint)]">
                        #{ticket.ticket_number}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ink)]">
                        {ticket.title}
                      </span>
                      <StatusBadge tone={statusTone(ticket.status)}>
                        {ticket.status.replace("_", " ")}
                      </StatusBadge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="surface p-6">
              <h2 className="font-display text-lg font-bold">Before you open a ticket</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Common requests like VPN access, model permissions, and GPU
                access already have step-by-step answers in Knowledge.
              </p>
              <Link href="/faq" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-ink)] hover:text-[var(--brand)]">
                Browse Knowledge <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="surface p-6">
              <h2 className="font-display text-lg font-bold">How the desk works</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Every request is routed by category, assigned to a specialist,
                and tracked with a visible case path until it is resolved.
              </p>
              <Link href="/tickets" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-ink)] hover:text-[var(--brand)]">
                See the queue <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </>
      )}

      {viewRole === "support_agent" && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Open"
              value={m.openCount}
              animate
              icon={<Inbox className="h-4 w-4" />}
            />
            <MetricCard
              label="In progress"
              value={m.inProgressCount}
              animate
              icon={<Clock className="h-4 w-4" />}
            />
            <MetricCard
              label="Unassigned"
              value={m.unassignedCount}
              animate
              icon={<Users className="h-4 w-4" />}
            />
            <MetricCard
              label="Urgent"
              value={m.urgentCount}
              animate
              valueClassName="text-[var(--danger)]"
              icon={<TriangleAlert className="h-4 w-4" />}
            />
          </section>

          <section className="surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Queue</h2>
              <Link
                href="/tickets"
                className="text-sm font-semibold text-[var(--brand-ink)] hover:text-[var(--brand)]"
              >
                Open queue
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--muted)]">
                The queue is clear.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {recent.map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={`/tickets/${ticket.id}`}
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
                      <StatusBadge tone={statusTone(ticket.status)}>
                        {ticket.status.replace("_", " ")}
                      </StatusBadge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {viewRole === "admin" && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total volume"
              value={m.totalVolume}
              animate
              icon={<Inbox className="h-4 w-4" />}
            />
            <MetricCard
              label="Resolution rate"
              value={`${m.resolutionRate}%`}
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <MetricCard
              label="Urgent"
              value={m.urgentCount}
              animate
              valueClassName="text-[var(--danger)]"
              icon={<TriangleAlert className="h-4 w-4" />}
            />
            <MetricCard
              label="Active incidents"
              value={m.activeIncidents}
              animate
              icon={<TriangleAlert className="h-4 w-4" />}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="surface p-6">
              <h2 className="font-display text-lg font-bold">Analytics</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Volume by category, department ratios, and CSV export.
              </p>
              <Link href="/admin/dashboard" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-ink)] hover:text-[var(--brand)]">
                Open analytics <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="surface p-6">
              <h2 className="font-display text-lg font-bold">Administration</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Incidents, API clients, and staff roles in one place.
              </p>
              <Link href="/admin/dashboard#admin" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-ink)] hover:text-[var(--brand)]">
                Manage workspace <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section className="surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Latest requests</h2>
              <Link
                href="/tickets"
                className="text-sm font-semibold text-[var(--brand-ink)] hover:text-[var(--brand)]"
              >
                Open queue
              </Link>
            </div>
            <ul className="divide-y divide-[var(--line)]">
              {recent.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="flex items-center gap-4 py-3.5 transition hover:bg-[var(--surface-2)]"
                  >
                    <span className="font-mono text-xs font-semibold text-[var(--faint)]">
                      #{ticket.ticket_number}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ink)]">
                      {ticket.title}
                    </span>
                    <StatusBadge tone={statusTone(ticket.status)}>
                      {ticket.status.replace("_", " ")}
                    </StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

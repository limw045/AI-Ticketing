"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { TicketActivity, RecentRequests } from "@/components/dashboard/TicketActivity";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/FormField";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { getRoleHomeMetrics } from "@/lib/dashboard-metrics";
import { getPortalMode, type PortalMode } from "@/lib/portal-mode";
import {
  CheckCircle2,
  TriangleAlert,
  Inbox,
  ArrowUpRight,
  Plus,
  UserRound,
  LayoutDashboard,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessNotice, setAccessNotice] = useState("");
  const [portalMode, setPortalModeState] = useState<PortalMode>("admin");

  useEffect(() => {
    setPortalModeState(getPortalMode());
    if (new URLSearchParams(window.location.search).get("error") === "forbidden") {
      setAccessNotice("You do not have permission to open that administration page.");
    }
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
        .select("id, display_name, user_type, department, department_id, role, account_status")
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

      const managementSelect = "*, author:profiles!tickets_author_id_fkey(id, display_name, department, user_type), assignee:profiles!tickets_assignee_id_fkey(id, display_name, department)";
      const userPortalSelect = "id, ticket_number, title, description, status, priority, category, department_id, author_id, assignee_id, source, subtasks, is_pinned, pin_order, created_at, updated_at, resolved_at, deleted_at, author:profiles!tickets_author_id_fkey(id, display_name, department, user_type), assignee:profiles!tickets_assignee_id_fkey(id, display_name, department)";
      const activePortalMode = getPortalMode();
      let ticketQuery = supabase
        .from("tickets")
        .select(activePortalMode === "admin" ? managementSelect : userPortalSelect)
        .is("deleted_at", null);
      if (activePortalMode !== "admin") {
        ticketQuery = ticketQuery.or(`author_id.eq.${user.id},department_id.eq.${profileData.department_id}`);
      }
      const { data: ticketData, error: ticketError } = await ticketQuery.order("created_at", { ascending: false });
      if (ticketError) setError(`Could not load tickets: ${ticketError.message}`);
      else setTickets(ticketData ?? []);

      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (error) {
    return (
      <div className="py-10">
        <Alert tone="error" role="alert">
          <span>{error}</span>
          <Button type="button" variant="secondary" onClick={() => window.location.reload()} className="ml-3 !px-3 !py-1.5 !text-xs">Retry</Button>
        </Alert>
      </div>
    );
  }

  const role = profile?.role || "employee";
  const isAdministrator = role === "admin" || role === "super_admin";
  const viewRole =
    isAdministrator && portalMode === "user" ? "employee" : isAdministrator ? "admin" : role;
  const visibleTickets = viewRole === "admin" ? tickets : tickets.filter(t => t.author_id === profile?.id);
  const m = getRoleHomeMetrics(visibleTickets, profile?.id);

  return (
    <div className="space-y-10">
      <PageHeader
        title={viewRole === "admin" ? "Workspace overview" : "Your workspace"}
        description={
          `Welcome back, ${profile?.display_name?.split(" ")[0] || "there"}. Here’s what’s happening with ${viewRole === "admin" ? "your service desk" : "your requests"}.`
        }
        actions={<Link href="/tickets/new"><Button><Plus size={16} /> New ticket</Button></Link>}
      />
      {accessNotice && <Alert tone="warning" role="alert">{accessNotice}</Alert>}
      {isAdministrator && portalMode === "user" && <Alert tone="info"><span>You’re viewing your personal requests.</span><Link href="/admin/dashboard" className="ml-3 inline-flex items-center gap-2 text-sm underline"><LayoutDashboard size={14} /> Open admin console</Link></Alert>}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Request summary">
        <MetricCard label={viewRole === "admin" ? "Total requests" : "Your requests"} value={m.totalVolume} icon={<Inbox size={15} />} hint="Across all dates" />
        <MetricCard label="Resolution rate" value={m.hasResolutionSample ? `${m.resolutionRate}%` : "—"} icon={<CheckCircle2 size={15} />} hint={m.hasResolutionSample ? "Resolved or closed requests" : "No requests yet"} />
        <MetricCard label="Urgent requests" value={m.urgentCount} icon={<TriangleAlert size={15} />} valueClassName="text-[var(--danger)]" hint="Needs attention" />
        <MetricCard label="Unassigned" value={m.unassignedCount} icon={<UserRound size={15} />} hint="Awaiting an owner" />
      </section>
      <TicketActivity tickets={visibleTickets} />
      <RecentRequests tickets={visibleTickets} personal={viewRole !== "admin"} />
      <section className="overview-shortcuts" aria-label="Workspace shortcuts">
        <Link href="/faq"><div><h2>Find an answer in Knowledge</h2><p>Practical guides for access, tools, and common requests.</p></div><ArrowUpRight size={18} /></Link>
        <Link href={viewRole === "admin" ? "/admin/dashboard" : "/tickets/new"}><div><h2>{viewRole === "admin" ? "Explore operations" : "Need a hand?"}</h2><p>{viewRole === "admin" ? "Explore department trends and manage your service desk." : "Share the details and get help from the team."}</p></div><ArrowUpRight size={18} /></Link>
      </section>
    </div>
  );
}

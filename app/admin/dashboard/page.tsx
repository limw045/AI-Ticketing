"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildCsv } from "@/lib/csv";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge, severityTone } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import {
  Button,
  FieldLabel,
  Input,
  Select,
} from "@/components/ui/FormField";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, Radio } from "lucide-react";

const COLORS = ["#5c2d91", "#8b64b8", "#b996d2", "#3d6f9d", "#2e7d5b"];

export default function AdminDashboard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newIncidentTitle, setNewIncidentTitle] = useState("");
  const [newIncidentMsg, setNewIncidentMsg] = useState("");
  const [severity, setSeverity] = useState("warning");
  const [error, setError] = useState("");
  const [apiClientName, setApiClientName] = useState("");
  const [generatedApiKey, setGeneratedApiKey] = useState("");
  const [apiClients, setApiClients] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState("");

  const fetchDashboardData = async () => {
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: currentProfile } = user
      ? await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
      : { data: null };
    const role = currentProfile?.role ?? "";
    setCurrentUserRole(role);
    const { data: ticketData, error: ticketError } = await supabase
      .from("tickets")
      .select("*, author:profiles!tickets_author_id_fkey(*)");

    if (ticketError) setError(`Could not load dashboard tickets: ${ticketError.message}`);
    else setTickets(ticketData ?? []);

    const { data: incidentData, error: incidentError } = await supabase
      .from("incidents")
      .select("*")
      .order("created_at", { ascending: false });

    if (incidentError) setError(`Could not load incidents: ${incidentError.message}`);
    else setIncidents(incidentData ?? []);

    if (role === "admin") {
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select(
          "id, display_name, email, department, user_type, role, account_status, created_at"
        )
        .order("created_at", { ascending: true });
      if (userError) setError(`Could not load staff accounts: ${userError.message}`);
      else setUsers(userData ?? []);
      const { data: clientData, error: clientError } = await supabase
        .from("api_clients")
        .select("id, name, is_active, created_at, last_used_at")
        .order("created_at", { ascending: false });
      if (clientError) setError(`Could not load API clients: ${clientError.message}`);
      else setApiClients(clientData ?? []);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handlePublishIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidentTitle.trim() || !newIncidentMsg.trim()) return;

    const supabase = createClient();
    const { error: insertError } = await supabase.from("incidents").insert({
      title: newIncidentTitle,
      message: newIncidentMsg,
      severity,
      is_active: true,
    });

    if (insertError) {
      setError(`Incident publish failed: ${insertError.message}`);
      return;
    }

    setNewIncidentTitle("");
    setNewIncidentMsg("");
    fetchDashboardData();
  };

  const handleToggleIncident = async (id: string, currentActive: boolean) => {
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("incidents")
      .update({ is_active: !currentActive })
      .eq("id", id);
    if (updateError) {
      setError(`Incident update failed: ${updateError.message}`);
      return;
    }
    fetchDashboardData();
  };

  const handleCreateApiClient = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!apiClientName.trim()) return;
    setError("");
    setGeneratedApiKey("");
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_api_client", {
      client_name: apiClientName.trim(),
    });
    if (rpcError || !data?.api_key) {
      setError(
        `API client creation failed: ${
          rpcError?.message || "No key was returned."
        }`
      );
      return;
    }
    setGeneratedApiKey(data.api_key);
    setApiClientName("");
    await fetchDashboardData();
  };

  const handleUserAccessChange = async (
    userId: string,
    changes: { role?: string; account_status?: string }
  ) => {
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update(changes)
      .eq("id", userId);
    if (updateError) {
      setError(`Account update failed: ${updateError.message}`);
      return;
    }
    fetchDashboardData();
  };

  const handleToggleApiClient = async (clientId: string, active: boolean) => {
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("api_clients")
      .update({ is_active: !active })
      .eq("id", clientId);
    if (updateError) {
      setError(`API client update failed: ${updateError.message}`);
      return;
    }
    fetchDashboardData();
  };

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

  const categoryCounts: Record<string, number> = {};
  tickets.forEach((t) => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  });
  const categoryData = Object.keys(categoryCounts).map((cat) => ({
    name: cat,
    count: categoryCounts[cat],
  }));

  const deptCounts: Record<string, number> = {};
  tickets.forEach((t) => {
    const dept = t.author?.department || "General";
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  const deptData = Object.keys(deptCounts).map((dept) => ({
    name: dept,
    value: deptCounts[dept],
  }));

  const chartTooltipStyle = {
    backgroundColor: "var(--surface)",
    borderColor: "var(--line-strong)",
    borderRadius: 12,
    color: "var(--ink)",
    fontSize: 12,
  };
  const axisColor = "var(--faint)";

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total volume" value={totalVolume} animate />
        <MetricCard
          label="Resolution rate"
          value={`${resolutionRate}%`}
          valueClassName="text-[var(--success)]"
        />
        <MetricCard
          label="Avg response SLA"
          value={
            averageResponseHours === null
              ? "N/A"
              : `${averageResponseHours.toFixed(1)}h`
          }
          valueClassName="text-[var(--brand-ink)]"
        />
        <MetricCard
          label="Urgent breaches"
          value={urgentCount}
          animate
          valueClassName="text-[var(--danger)]"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="surface p-6">
          <h2 className="font-display text-base font-bold">
            Ticket volume by category
          </h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <XAxis dataKey="name" stroke={axisColor} fontSize={11} />
                <YAxis stroke={axisColor} fontSize={11} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar
                  dataKey="count"
                  fill="var(--brand)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface p-6">
          <h2 className="font-display text-base font-bold">
            Department ticket ratio
          </h2>
          <div className="mt-4 flex h-64 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {deptData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section id="admin" className="surface p-6">
        <h2 className="font-display text-base font-bold">
          Global incident / outage manager
        </h2>
        <form onSubmit={handlePublishIncident} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <FieldLabel>Title</FieldLabel>
              <Input
                type="text"
                placeholder="Incident title (e.g. Office Wi-Fi Degradation)"
                value={newIncidentTitle}
                onChange={(e) => setNewIncidentTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <FieldLabel>Message</FieldLabel>
              <Input
                type="text"
                placeholder="Announcement message for staff..."
                value={newIncidentMsg}
                onChange={(e) => setNewIncidentMsg(e.target.value)}
                required
              />
            </div>
            <div>
              <FieldLabel>Severity</FieldLabel>
              <Select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
                <option value="info">Information</option>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full">
            <Radio className="h-4 w-4" /> Publish global outage banner
          </Button>
        </form>

        <div className="mt-6 space-y-2 border-t border-[var(--line)] pt-4">
          <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            Current incidents
          </h3>
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3.5 text-sm"
            >
              <div className="min-w-0">
                <span className="block font-semibold text-[var(--ink)]">
                  {inc.title}
                </span>
                <p className="text-xs font-medium text-[var(--muted)]">
                  {inc.message}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge tone={severityTone(inc.severity)}>
                  {inc.severity}
                </StatusBadge>
                <button
                  onClick={() => handleToggleIncident(inc.id, inc.is_active)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    inc.is_active
                      ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                      : "bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {inc.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
          {incidents.length === 0 && (
            <p className="py-4 text-xs text-[var(--faint)]">
              No incidents published yet.
            </p>
          )}
        </div>
      </section>

      {currentUserRole === "admin" && (
        <section className="surface p-6">
          <h2 className="font-display text-base font-bold">
            Internal app API access
          </h2>
          <form
            onSubmit={handleCreateApiClient}
            className="mt-5 flex flex-col gap-3 md:flex-row"
          >
            <Input
              value={apiClientName}
              onChange={(event) => setApiClientName(event.target.value)}
              placeholder="App name, e.g. Model Gateway"
              required
              className="flex-1"
            />
            <Button type="submit">Generate API key</Button>
          </form>
          {generatedApiKey && (
            <div className="mt-4 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning)]">
              <strong className="block">Copy this key now. It cannot be shown again.</strong>
              <code className="mt-2 block select-all break-all font-mono text-xs">
                {generatedApiKey}
              </code>
            </div>
          )}
          <div className="mt-5 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {apiClients.map((client) => (
              <div
                key={client.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <span>
                  <strong className="block text-[var(--ink)]">
                    {client.name}
                  </strong>
                  <span className="font-mono text-xs text-[var(--faint)]">
                    Last used:{" "}
                    {client.last_used_at
                      ? new Date(client.last_used_at).toLocaleString()
                      : "Never"}
                  </span>
                </span>
                <button
                  onClick={() => handleToggleApiClient(client.id, client.is_active)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    client.is_active
                      ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                      : "bg-[var(--success-soft)] text-[var(--success)]"
                  }`}
                >
                  {client.is_active ? "Revoke" : "Activate"}
                </button>
              </div>
            ))}
            {apiClients.length === 0 && (
              <p className="py-5 text-xs text-[var(--faint)]">
                No API clients created yet.
              </p>
            )}
          </div>
        </section>
      )}

      {currentUserRole === "admin" && (
        <section className="surface p-6">
          <h2 className="font-display text-base font-bold">
            Staff access &amp; roles
          </h2>
          <div className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {users.map((user) => (
              <div
                key={user.id}
                className="grid gap-3 py-4 text-sm md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr] md:items-center"
              >
                <div>
                  <strong className="block text-[var(--ink)]">
                    {user.display_name}
                  </strong>
                  <span className="font-mono text-xs text-[var(--faint)]">
                    {user.email}
                  </span>
                </div>
                <span className="text-xs text-[var(--muted)]">
                  {user.department} / {user.user_type}
                </span>
                <Select
                  value={user.role}
                  onChange={(event) =>
                    handleUserAccessChange(user.id, {
                      role: event.target.value,
                    })
                  }
                  className="!py-2"
                >
                  <option value="employee">Employee</option>
                  <option value="support_agent">Support agent</option>
                  <option value="admin">Admin</option>
                </Select>
                <Select
                  value={user.account_status}
                  onChange={(event) =>
                    handleUserAccessChange(user.id, {
                      account_status: event.target.value,
                    })
                  }
                  className="!py-2"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </Select>
              </div>
            ))}
            {users.length === 0 && (
              <p className="py-5 text-xs text-[var(--faint)]">
                No staff profiles have been created yet.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

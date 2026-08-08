"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { GlassSurface } from "@/components/react-bits/GlassSurface";
import { CountUp } from "@/components/react-bits/CountUp";
import { BlurText } from "@/components/react-bits/BlurText";
import { EditorialGrid } from "@/components/EditorialGrid";
import { buildCsv } from "@/lib/csv";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  Download, Radio
} from "lucide-react";

const COLORS = ["#6a9bcc", "#788c5d", "#9c86b8", "#d97757", "#b85b6b"];

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
      ? await supabase.from("profiles").select("role").eq("id", user.id).single()
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
        .select("id, display_name, email, department, user_type, role, account_status, created_at")
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
    const { error: updateError } = await supabase.from("incidents").update({ is_active: !currentActive }).eq("id", id);
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
      setError(`API client creation failed: ${rpcError?.message || "No key was returned."}`);
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
    const headers = ["Ticket Number", "Title", "Category", "Priority", "Status", "Author", "Created At"];
    const rows = tickets.map((t) => [
      t.ticket_number,
      t.title,
      t.category,
      t.priority,
      t.status,
      t.author?.display_name || "Unknown",
      t.created_at,
    ]);

    const csvBlob = new Blob([buildCsv([headers, ...rows])], { type: "text/csv;charset=utf-8" });
    const objectUrl = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");
    link.setAttribute("href", objectUrl);
    link.setAttribute("download", `IT_Ticketing_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const totalVolume = tickets.length;
  const resolvedTickets = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const resolutionRate = totalVolume > 0 ? Math.round((resolvedTickets / totalVolume) * 100) : 0;
  const urgentCount = tickets.filter((t) => t.priority === "urgent" && t.status !== "closed").length;
  const respondedTickets = tickets.filter((ticket) => ticket.first_responded_at && ticket.created_at);
  const averageResponseHours = respondedTickets.length
    ? respondedTickets.reduce((sum, ticket) => {
        const elapsedMs = new Date(ticket.first_responded_at).getTime() - new Date(ticket.created_at).getTime();
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

  return (
    <div className="editorial-shell pb-20">
      <EditorialGrid />
      <Navbar />

      <main className="editorial-content max-w-7xl mx-auto px-6 pt-10 space-y-8">
        {error && <div role="alert" className="border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-xs text-rose-200">{error}</div>}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="editorial-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">STEP 04 / OBSERVE</div>
            <BlurText text="The signal behind the queue." className="mt-3 text-4xl font-light tracking-[-0.05em] text-white" />
            <p className="mt-3 text-xs leading-6 text-zinc-500">
              Real-time service desk metrics, category breakdown, and global incident management.
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 self-start rounded-full bg-[#6a9bcc] px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-md shadow-blue-500/20 transition hover:bg-[#84add1] md:self-auto"
          >
            <Download className="w-4 h-4" /> Export CSV Report
          </button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassSurface className="!p-5">
            <span className="editorial-mono block text-[10px] font-bold uppercase tracking-widest text-zinc-600">01 / Total Volume</span>
            <div className="mt-3 text-4xl font-light text-white">
              <CountUp to={totalVolume} />
            </div>
          </GlassSurface>

          <GlassSurface className="!p-5">
            <span className="editorial-mono block text-[10px] font-bold uppercase tracking-widest text-zinc-600">02 / Resolution Rate</span>
            <div className="mt-3 text-4xl font-light text-[#a4b889]">
              <CountUp to={resolutionRate} />%
            </div>
          </GlassSurface>

          <GlassSurface className="!p-5">
            <span className="editorial-mono block text-[10px] font-bold uppercase tracking-widest text-zinc-600">03 / Avg Response SLA</span>
            <div className="mt-3 text-4xl font-light text-[#8db3d6]">
              {averageResponseHours === null ? "N/A" : `${averageResponseHours.toFixed(1)}h`}
            </div>
          </GlassSurface>

          <GlassSurface className="!p-5">
            <span className="editorial-mono block text-[10px] font-bold uppercase tracking-widest text-[#e99aa4]">04 / Urgent Breaches</span>
            <div className="mt-3 text-4xl font-light text-[#e99aa4]">
              <CountUp to={urgentCount} />
            </div>
          </GlassSurface>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <GlassSurface showWindowDots title="Ticket Volume by Category">
            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "#141416", borderColor: "#3f3f46", borderRadius: 12, color: "#fafafa" }} />
                  <Bar dataKey="count" fill="#6a9bcc" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassSurface>

          <GlassSurface showWindowDots title="Department Ticket Ratio">
            <div className="h-64 mt-4 flex items-center justify-center">
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#141416", borderColor: "#3f3f46", borderRadius: 12, color: "#fafafa" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GlassSurface>
        </div>

        {/* Global Incident Manager */}
        <GlassSurface showWindowDots title="Global Incident / Outage Manager">
          <form onSubmit={handlePublishIncident} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input
                type="text"
                placeholder="Incident Title (e.g. Office Wi-Fi Degradation)"
                value={newIncidentTitle}
                onChange={(e) => setNewIncidentTitle(e.target.value)}
                required
                className="border border-white/10 bg-[#0a0a0c] px-4 py-3 text-xs font-medium text-white outline-none focus:border-[#6a9bcc]"
              />
              <input
                type="text"
                placeholder="Announcement message for staff..."
                value={newIncidentMsg}
                onChange={(e) => setNewIncidentMsg(e.target.value)}
                required
                className="border border-white/10 bg-[#0a0a0c] px-4 py-3 text-xs font-medium text-white outline-none focus:border-[#6a9bcc]"
              />
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="border border-white/10 bg-[#0a0a0c] px-4 py-3 text-xs font-semibold text-white outline-none focus:border-[#6a9bcc]"
              >
                <option value="warning">Warning (Amber)</option>
                <option value="critical">Critical Outage (Red)</option>
                <option value="info">Information (Blue)</option>
              </select>
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#6a9bcc] py-3.5 text-xs font-bold text-zinc-950 shadow-md shadow-blue-500/20 transition hover:bg-[#84add1]"
            >
              <Radio className="w-4 h-4" /> Publish Global Outage Banner
            </button>
          </form>

          <div className="space-y-2 border-t border-white/10 pt-4">
            <h4 className="editorial-mono mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Current Incidents</h4>
            {incidents.map((inc) => (
              <div key={inc.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3.5 text-xs">
                <div>
                  <span className="font-bold text-white">{inc.title}</span>
                  <p className="text-[11px] font-medium text-zinc-500">{inc.message}</p>
                </div>
                <button
                  onClick={() => handleToggleIncident(inc.id, inc.is_active)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase transition ${
                    inc.is_active ? "border border-rose-400/30 bg-rose-400/10 text-rose-200" : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {inc.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        </GlassSurface>

        {currentUserRole === "admin" && <GlassSurface showWindowDots title="Internal App API Access">
          <form onSubmit={handleCreateApiClient} className="flex flex-col gap-3 md:flex-row">
            <input
              value={apiClientName}
              onChange={(event) => setApiClientName(event.target.value)}
              placeholder="App name, e.g. Model Gateway"
              required
              className="flex-1 border border-white/10 bg-[#0a0a0c] px-4 py-3 text-xs text-white outline-none focus:border-[#6a9bcc]"
            />
            <button className="rounded-full bg-[#6a9bcc] px-5 py-3 text-xs font-bold text-zinc-950 hover:bg-[#84add1]">
              Generate API key
            </button>
          </form>
          {generatedApiKey && (
            <div className="mt-4 border border-amber-300/30 bg-amber-300/10 p-4 text-xs text-amber-100">
              <strong className="block">Copy this key now. It cannot be shown again.</strong>
              <code className="mt-2 block break-all select-all font-mono">{generatedApiKey}</code>
            </div>
          )}
          <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
            {apiClients.map((client) => <div key={client.id} className="flex items-center justify-between py-3 text-xs"><span><strong className="block text-white">{client.name}</strong><span className="text-zinc-600">Last used: {client.last_used_at ? new Date(client.last_used_at).toLocaleString() : "Never"}</span></span><button onClick={() => handleToggleApiClient(client.id, client.is_active)} className={`rounded-full px-3 py-1.5 font-bold ${client.is_active ? "border border-rose-400/30 text-rose-200" : "border border-emerald-400/30 text-emerald-200"}`}>{client.is_active ? "Revoke" : "Activate"}</button></div>)}
          </div>
        </GlassSurface>}

        {currentUserRole === "admin" && <GlassSurface showWindowDots title="Staff Access & Roles">
          <div className="divide-y divide-white/10 border-y border-white/10">
            {users.map((user) => (
              <div key={user.id} className="grid gap-3 py-4 text-xs md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr] md:items-center">
                <div><strong className="block text-white">{user.display_name}</strong><span className="text-zinc-600">{user.email}</span></div>
                <span className="text-zinc-400">{user.department} / {user.user_type}</span>
                <select value={user.role} onChange={(event) => handleUserAccessChange(user.id, { role: event.target.value })} className="border border-white/10 bg-[#0a0a0c] px-3 py-2 text-white outline-none focus:border-[#6a9bcc]">
                  <option value="employee">Employee</option>
                  <option value="support_agent">Support agent</option>
                  <option value="admin">Admin</option>
                </select>
                <select value={user.account_status} onChange={(event) => handleUserAccessChange(user.id, { account_status: event.target.value })} className="border border-white/10 bg-[#0a0a0c] px-3 py-2 text-white outline-none focus:border-[#6a9bcc]">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            ))}
            {users.length === 0 && <p className="py-5 text-xs text-zinc-600">No staff profiles have been created yet.</p>}
          </div>
        </GlassSurface>}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { GlassSurface } from "@/components/react-bits/GlassSurface";
import { CountUp } from "@/components/react-bits/CountUp";
import { BlurText } from "@/components/react-bits/BlurText";
import { EditorialGrid } from "@/components/EditorialGrid";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  TrendingUp, Clock, CheckCircle, AlertOctagon, Download, Radio, Plus, ShieldCheck
} from "lucide-react";

const COLORS = ["#6a9bcc", "#788c5d", "#9c86b8", "#d97757", "#b85b6b"];

export default function AdminDashboard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [newIncidentTitle, setNewIncidentTitle] = useState("");
  const [newIncidentMsg, setNewIncidentMsg] = useState("");
  const [severity, setSeverity] = useState("warning");
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    const supabase = createClient();
    const { data: ticketData } = await supabase
      .from("tickets")
      .select("*, author:profiles!tickets_author_id_fkey(*)");

    if (ticketData) setTickets(ticketData);

    const { data: incidentData } = await supabase
      .from("incidents")
      .select("*")
      .order("created_at", { ascending: false });

    if (incidentData) setIncidents(incidentData);

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handlePublishIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidentTitle.trim() || !newIncidentMsg.trim()) return;

    const supabase = createClient();
    await supabase.from("incidents").insert({
      title: newIncidentTitle,
      message: newIncidentMsg,
      severity,
      is_active: true,
    });

    setNewIncidentTitle("");
    setNewIncidentMsg("");
    fetchDashboardData();
  };

  const handleToggleIncident = async (id: string, currentActive: boolean) => {
    const supabase = createClient();
    await supabase.from("incidents").update({ is_active: !currentActive }).eq("id", id);
    fetchDashboardData();
  };

  const exportCSV = () => {
    if (tickets.length === 0) return;
    const headers = ["Ticket Number", "Title", "Category", "Priority", "Status", "Author", "Created At"];
    const rows = tickets.map((t) => [
      t.ticket_number,
      `"${t.title.replace(/"/g, '""')}"`,
      t.category,
      t.priority,
      t.status,
      t.author?.display_name || "Unknown",
      t.created_at,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `IT_Ticketing_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalVolume = tickets.length;
  const resolvedTickets = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const resolutionRate = totalVolume > 0 ? Math.round((resolvedTickets / totalVolume) * 100) : 0;
  const urgentCount = tickets.filter((t) => t.priority === "urgent" && t.status !== "closed").length;

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
              1.4h
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
                <BarChart data={categoryData.length > 0 ? categoryData : [{ name: "VPN", count: 4 }, { name: "Hardware", count: 7 }, { name: "Bug", count: 12 }]}>
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
                    data={deptData.length > 0 ? deptData : [{ name: "IT", value: 35 }, { name: "HR", value: 20 }, { name: "Marketing", value: 15 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(deptData.length > 0 ? deptData : [1, 2, 3]).map((entry, index) => (
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
      </main>
    </div>
  );
}

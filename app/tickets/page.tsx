"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { IncidentBanner } from "@/components/IncidentBanner";
import { SpotlightCard } from "@/components/react-bits/SpotlightCard";
import { CountUp } from "@/components/react-bits/CountUp";
import { ShinyText } from "@/components/react-bits/ShinyText";
import { BlurText } from "@/components/react-bits/BlurText";
import { GlassSurface } from "@/components/react-bits/GlassSurface";
import {
  Search, Filter, CheckSquare, Square, CheckCircle2, Clock, XCircle, AlertTriangle, ArrowUpDown, CornerDownLeft
} from "lucide-react";

export default function TicketDashboard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    const { data } = await supabase
      .from("tickets")
      .select("*, author:profiles!tickets_author_id_fkey(*), assignee:profiles!tickets_assignee_id_fkey(*)")
      .order("created_at", { ascending: false });

    if (data) {
      setTickets(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    let result = [...tickets];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.ticket_number.toString().includes(term) ||
          t.category.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }

    if (onlyMine && currentUser) {
      result = result.filter((t) => t.author_id === currentUser.id);
    }

    setFilteredTickets(result);
    setSelectedIndex(0);
  }, [searchTerm, statusFilter, categoryFilter, onlyMine, tickets, currentUser]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === "j" || e.key === "J") {
        setSelectedIndex((prev) => Math.min(prev + 1, filteredTickets.length - 1));
      } else if (e.key === "k" || e.key === "K") {
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filteredTickets[selectedIndex]) {
        window.location.href = `/tickets/${filteredTickets[selectedIndex].id}`;
      } else if ((e.key === "c" || e.key === "C") && filteredTickets[selectedIndex]) {
        const supabase = createClient();
        await supabase
          .from("tickets")
          .update({ status: "closed", resolved_at: new Date().toISOString() })
          .eq("id", filteredTickets[selectedIndex].id);
        fetchTickets();
      } else if ((e.key === "m" || e.key === "M") && filteredTickets[selectedIndex] && currentUser) {
        const supabase = createClient();
        await supabase
          .from("tickets")
          .update({ assignee_id: currentUser.id })
          .eq("id", filteredTickets[selectedIndex].id);
        fetchTickets();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredTickets, selectedIndex, currentUser]);

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    const supabase = createClient();
    await supabase
      .from("tickets")
      .update({
        status: newStatus,
        ...(newStatus === "resolved" || newStatus === "closed"
          ? { resolved_at: new Date().toISOString() }
          : {}),
      })
      .in("id", selectedIds);

    setSelectedIds([]);
    fetchTickets();
  };

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const urgentCount = tickets.filter((t) => t.priority === "urgent" && t.status !== "closed").length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-6">
        <IncidentBanner />

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <BlurText text="Ticket Management" className="text-3xl font-extrabold tracking-tight text-slate-900" />
            <p className="text-xs text-slate-500 mt-1">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">J</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">K</kbd> to navigate, <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">M</kbd> to assign self, <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">C</kbd> to close.
            </p>
          </div>

          <a
            href="/tickets/new"
            className="self-start md:self-auto px-4.5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition"
          >
            + Create New Ticket
          </a>
        </div>

        {/* Top Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassSurface className="!p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Open Tickets</span>
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-extrabold mt-2 text-emerald-600">
              <CountUp to={openCount} />
            </div>
          </GlassSurface>

          <GlassSurface className="!p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">In Progress</span>
              <ArrowUpDown className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-3xl font-extrabold mt-2 text-indigo-600">
              <CountUp to={inProgressCount} />
            </div>
          </GlassSurface>

          <GlassSurface className="!p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resolved</span>
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-extrabold mt-2 text-slate-700">
              <CountUp to={resolvedCount} />
            </div>
          </GlassSurface>

          <GlassSurface className="!p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Urgent (P0)</span>
              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
            </div>
            <div className="text-3xl font-extrabold mt-2 text-rose-600">
              <CountUp to={urgentCount} />
            </div>
          </GlassSurface>
        </div>

        {/* Filter Bar */}
        <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket #, title, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 font-medium"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="System Bug">System Bug</option>
              <option value="Hardware">Hardware</option>
              <option value="VPN & Network">VPN & Network</option>
              <option value="Permissions">Permissions</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(e) => setOnlyMine(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-0"
              />
              <span>Created by Me</span>
            </label>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs text-blue-900 shadow-sm">
            <span className="font-bold">{selectedIds.length} tickets selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkStatusChange("in_progress")}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                Mark In Progress
              </button>
              <button
                onClick={() => handleBulkStatusChange("resolved")}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Mark Resolved
              </button>
              <button
                onClick={() => handleBulkStatusChange("closed")}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold"
              >
                Mark Closed
              </button>
            </div>
          </div>
        )}

        {/* Tickets List */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Loading tickets...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm glass-panel rounded-3xl">
            No tickets found matching your filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket, idx) => {
              const isSelected = idx === selectedIndex;
              const isChecked = selectedIds.includes(ticket.id);

              return (
                <SpotlightCard
                  key={ticket.id}
                  onClick={() => (window.location.href = `/tickets/${ticket.id}`)}
                  className={`!p-4.5 ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectOne(ticket.id);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>

                      {ticket.status === "open" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-500/50" />
                      )}
                      {ticket.status === "in_progress" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 shadow-sm shadow-indigo-500/50" />
                      )}
                      {(ticket.status === "resolved" || ticket.status === "closed") && (
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                      )}

                      <span className="font-mono text-xs font-bold text-slate-400 shrink-0">
                        #{ticket.ticket_number}
                      </span>

                      <h3 className="text-sm font-bold text-slate-900 truncate hover:text-blue-600 transition">
                        {ticket.title}
                      </h3>

                      {ticket.priority === "urgent" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200 uppercase shrink-0">
                          P0 Urgent
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-[11px]">
                        {ticket.category}
                      </span>

                      <div className="text-right">
                        <span className="font-bold text-slate-800 block leading-tight">
                          {ticket.author?.display_name || "Unknown Author"}
                        </span>
                        <span className="text-[10px] font-bold block">
                          {ticket.author?.user_type === "intern" ? (
                            <span className="text-amber-700">Intern</span>
                          ) : (
                            <span className="text-slate-500">Staff</span>
                          )}
                        </span>
                      </div>

                      <span className="text-[11px] font-semibold text-slate-400 w-16 text-right">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { IncidentBanner } from "@/components/IncidentBanner";
import { SpotlightCard } from "@/components/react-bits/SpotlightCard";
import { CountUp } from "@/components/react-bits/CountUp";
import { BlurText } from "@/components/react-bits/BlurText";
import { GlassSurface } from "@/components/react-bits/GlassSurface";
import { EditorialGrid } from "@/components/EditorialGrid";
import {
  Search, CheckSquare, Square, CheckCircle2, Clock, AlertTriangle, ArrowUpDown
} from "lucide-react";

export default function TicketDashboard() {
  const router = useRouter();
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
  const [error, setError] = useState("");
  const isAgent = currentUser?.role === "support_agent" || currentUser?.role === "admin";

  const fetchTickets = useCallback(async () => {
    setError("");
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      router.replace("/login");
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, role, account_status")
      .eq("id", user.id)
      .single();
    if (profileError || !profile || profile.account_status !== "active") {
      setError(profileError?.message || "Your staff profile is unavailable or inactive.");
      setLoading(false);
      return;
    }
    setCurrentUser(profile);

    const { data, error: ticketError } = await supabase
      .from("tickets")
      .select("*, author:profiles!tickets_author_id_fkey(id, display_name, department, user_type), assignee:profiles!tickets_assignee_id_fkey(id, display_name, department)")
      .order("created_at", { ascending: false });

    if (ticketError) {
      setError(`Could not load tickets: ${ticketError.message}`);
    } else {
      setTickets(data ?? []);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

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
        router.push(`/tickets/${filteredTickets[selectedIndex].id}`);
      } else if (isAgent && (e.key === "c" || e.key === "C") && filteredTickets[selectedIndex]) {
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from("tickets")
          .update({ status: "closed", resolved_at: new Date().toISOString() })
          .eq("id", filteredTickets[selectedIndex].id);
        if (updateError) setError(`Could not close ticket: ${updateError.message}`);
        fetchTickets();
      } else if (isAgent && (e.key === "m" || e.key === "M") && filteredTickets[selectedIndex] && currentUser) {
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from("tickets")
          .update({ assignee_id: currentUser.id })
          .eq("id", filteredTickets[selectedIndex].id);
        if (updateError) setError(`Could not assign ticket: ${updateError.message}`);
        fetchTickets();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredTickets, selectedIndex, currentUser, isAgent, router, fetchTickets]);

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (!isAgent || selectedIds.length === 0) return;
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tickets")
      .update({
        status: newStatus,
        ...(newStatus === "resolved" || newStatus === "closed"
          ? { resolved_at: new Date().toISOString() }
          : {}),
      })
      .in("id", selectedIds);

    if (updateError) {
      setError(`Bulk update failed: ${updateError.message}`);
      return;
    }

    setSelectedIds([]);
    fetchTickets();
  };

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
  const urgentCount = tickets.filter((t) => t.priority === "urgent" && t.status !== "closed").length;

  return (
    <div className="editorial-shell pb-20">
      <EditorialGrid />
      <Navbar />

      <main className="editorial-content max-w-7xl mx-auto px-6 pt-10 space-y-8">
        <IncidentBanner />
        {error && <div role="alert" className="border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-xs text-rose-200">{error}</div>}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="editorial-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">STEP 01 / PROCESS</div>
            <BlurText text="The request queue." className="mt-3 text-4xl font-light tracking-[-0.05em] text-white" />
            <p className="mt-3 text-xs leading-6 text-zinc-500">
              Press <kbd className="rounded border border-white/10 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">J</kbd> / <kbd className="rounded border border-white/10 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">K</kbd> to navigate, <kbd className="rounded border border-white/10 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">M</kbd> to assign self, <kbd className="rounded border border-white/10 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">C</kbd> to close.
            </p>
          </div>

          <Link
            href="/tickets/new"
            className="self-start md:self-auto rounded-full bg-[#6a9bcc] px-5 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-blue-500/10 transition hover:bg-[#84add1]"
          >
            + Create New Ticket
          </Link>
        </div>

        {/* Top Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassSurface className="!p-5">
            <div className="flex items-center justify-between">
              <span className="editorial-mono text-[10px] uppercase tracking-widest text-zinc-500">01 / Open</span>
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3 text-4xl font-light text-[#a4b889]">
              <CountUp to={openCount} />
            </div>
          </GlassSurface>

          <GlassSurface className="!p-5">
            <div className="flex items-center justify-between">
              <span className="editorial-mono text-[10px] uppercase tracking-widest text-zinc-500">02 / Active</span>
              <ArrowUpDown className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-3 text-4xl font-light text-[#8db3d6]">
              <CountUp to={inProgressCount} />
            </div>
          </GlassSurface>

          <GlassSurface className="!p-5">
            <div className="flex items-center justify-between">
              <span className="editorial-mono text-[10px] uppercase tracking-widest text-zinc-500">03 / Resolved</span>
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-3 text-4xl font-light text-white">
              <CountUp to={resolvedCount} />
            </div>
          </GlassSurface>

          <GlassSurface className="!p-5">
            <div className="flex items-center justify-between">
              <span className="editorial-mono text-[10px] uppercase tracking-widest text-[#e99aa4]">04 / Urgent</span>
              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
            </div>
            <div className="mt-3 text-4xl font-light text-[#e99aa4]">
              <CountUp to={urgentCount} />
            </div>
          </GlassSurface>
        </div>

        {/* Filter Bar */}
        <div className="glass-panel rounded-2xl border-white/10 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket #, title, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-white/10 bg-[#0a0a0c] py-2.5 pl-10 pr-4 text-xs font-medium text-white outline-none placeholder:text-zinc-700 focus:border-[#6a9bcc]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-white/10 bg-[#0a0a0c] px-3.5 py-2.5 text-xs font-semibold text-white outline-none focus:border-[#6a9bcc]"
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
              className="border border-white/10 bg-[#0a0a0c] px-3.5 py-2.5 text-xs font-semibold text-white outline-none focus:border-[#6a9bcc]"
            >
              <option value="all">All Categories</option>
              <option value="System Bug">System Bug</option>
              <option value="Hardware">Hardware</option>
              <option value="VPN & Network">VPN & Network</option>
              <option value="Permissions">Permissions</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
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
        {isAgent && selectedIds.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-[#141416] border border-[#6a9bcc]/30 flex items-center justify-between text-xs text-[#d7e6f3] shadow-xl">
            <span className="font-bold">{selectedIds.length} tickets selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkStatusChange("in_progress")}
                className="rounded-full bg-[#6a9bcc] px-3 py-1.5 font-bold text-zinc-950 hover:bg-[#84add1]"
              >
                Mark In Progress
              </button>
              <button
                onClick={() => handleBulkStatusChange("resolved")}
                className="rounded-full bg-[#788c5d] px-3 py-1.5 font-bold text-zinc-950 hover:bg-[#9aae75]"
              >
                Mark Resolved
              </button>
              <button
                onClick={() => handleBulkStatusChange("closed")}
                className="rounded-full border border-white/10 bg-zinc-800 px-3 py-1.5 font-bold text-white hover:bg-zinc-700"
              >
                Mark Closed
              </button>
            </div>
          </div>
        )}

        {/* Tickets List */}
        {loading ? (
          <div className="editorial-mono py-16 text-center text-xs uppercase tracking-widest text-zinc-600">Loading request queue...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="glass-panel rounded-2xl py-16 text-center text-sm text-zinc-500">
            No requests found matching this view.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket, idx) => {
              const isSelected = idx === selectedIndex;
              const isChecked = selectedIds.includes(ticket.id);

              return (
                <SpotlightCard
                  key={ticket.id}
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                  className={`!p-4.5 ${
                    isSelected
                      ? "border-[#6a9bcc]/70 ring-1 ring-[#6a9bcc]/30 bg-[#161b21]"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isAgent && <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectOne(ticket.id);
                        }}
                        className="text-zinc-600 hover:text-white"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[#8db3d6]" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-700" />
                        )}
                      </button>}

                      {ticket.status === "open" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#a4b889] shrink-0 shadow-sm shadow-[#a4b889]/50" />
                      )}
                      {ticket.status === "in_progress" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#8db3d6] shrink-0 shadow-sm shadow-[#8db3d6]/50" />
                      )}
                      {(ticket.status === "resolved" || ticket.status === "closed") && (
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-600 shrink-0" />
                      )}

                      <span className="editorial-mono text-xs font-bold text-zinc-600 shrink-0">
                        #{ticket.ticket_number}
                      </span>

                      <h3 className="truncate text-sm font-bold text-white transition hover:text-[#8db3d6]">
                        {ticket.title}
                      </h3>

                      {ticket.priority === "urgent" && (
                        <span className="rounded border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-rose-200 shrink-0">
                          P0 Urgent
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <span className="editorial-mono rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-zinc-500">
                        {ticket.category}
                      </span>

                      <div className="text-right">
                        <span className="block leading-tight font-bold text-white">
                          {ticket.author?.display_name || "Unknown Author"}
                        </span>
                        <span className="text-[10px] font-bold block">
                          {ticket.author?.user_type === "intern" ? (
                            <span className="text-[#e0a58b]">Intern</span>
                          ) : (
                            <span className="text-zinc-500">Staff</span>
                          )}
                        </span>
                      </div>

                      <span className="editorial-mono w-16 text-right text-[10px] font-semibold text-zinc-600">
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

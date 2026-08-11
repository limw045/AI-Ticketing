"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  StatusBadge,
  statusTone,
  priorityTone,
} from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/FormField";
import {
  Search,
  CheckSquare,
  Square,
  CheckCircle2,
  Clock,
  TriangleAlert,
  ArrowUpDown,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { getHistoricalCategoryOptions } from "@/lib/ticket-categories";

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
  const isAgent =
    currentUser?.role === "admin" || currentUser?.role === "super_admin";

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
      setError(
        profileError?.message ||
          "Your staff profile is unavailable or inactive."
      );
      setLoading(false);
      return;
    }
    setCurrentUser(profile);

    const { data, error: ticketError } = await supabase
      .from("tickets")
      .select(
        "*, author:profiles!tickets_author_id_fkey(id, display_name, department, user_type), assignee:profiles!tickets_assignee_id_fkey(id, display_name, department)"
      )
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
    if (window.location.search.includes("mine=1")) {
      setOnlyMine(true);
    }
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
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName))
        return;

      if (e.key === "j" || e.key === "J") {
        setSelectedIndex((prev) =>
          Math.min(prev + 1, filteredTickets.length - 1)
        );
      } else if (e.key === "k" || e.key === "K") {
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filteredTickets[selectedIndex]) {
        router.push(`/tickets/${filteredTickets[selectedIndex].id}`);
      } else if (
        isAgent &&
        (e.key === "c" || e.key === "C") &&
        filteredTickets[selectedIndex]
      ) {
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from("tickets")
          .update({
            status: "closed",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", filteredTickets[selectedIndex].id);
        if (updateError) setError(`Could not close ticket: ${updateError.message}`);
        fetchTickets();
      } else if (
        isAgent &&
        (e.key === "m" || e.key === "M") &&
        filteredTickets[selectedIndex] &&
        currentUser
      ) {
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
  const inProgressCount = tickets.filter(
    (t) => t.status === "in_progress"
  ).length;
  const resolvedCount = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  ).length;
  const urgentCount = tickets.filter(
    (t) => t.priority === "urgent" && t.status !== "closed"
  ).length;
  const categoryOptions = useMemo(
    () => getHistoricalCategoryOptions(tickets),
    [tickets]
  );

  return (
    <div className="space-y-10">
      {error && (
        <Alert tone="error" role="alert">
          {error}
        </Alert>
      )}

      <PageHeader
        eyebrow="Request queue"
        title="Tickets"
        description="Search, filter, and move requests through the desk. J / K navigate, M assigns yourself, C closes."
        actions={
          <Link href="/tickets/new">
            <Button>
              <Plus className="h-4 w-4" /> New ticket
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Open"
          value={openCount}
          animate
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          label="In progress"
          value={inProgressCount}
          animate
          icon={<ArrowUpDown className="h-4 w-4" />}
        />
        <MetricCard
          label="Resolved"
          value={resolvedCount}
          animate
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricCard
          label="Urgent"
          value={urgentCount}
          animate
          valueClassName="text-[var(--danger)]"
          icon={<TriangleAlert className="h-4 w-4" />}
        />
      </div>

      <div className="surface flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex min-w-[280px] flex-1 items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-[var(--faint)]" />
            <input
              type="text"
              placeholder="Search ticket #, title, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--faint)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] outline-none focus:border-[var(--brand)]"
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
            className="rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] outline-none focus:border-[var(--brand)]"
          >
            <option value="all">All Categories</option>
            {categoryOptions.map((categoryOption) => (
              <option key={categoryOption} value={categoryOption}>
                {categoryOption}
              </option>
            ))}
          </select>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--muted)]">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--line-strong)] text-[var(--brand)] focus:ring-[var(--brand-soft)]"
          />
          <span>Created by Me</span>
        </label>
      </div>

      {isAgent && selectedIds.length > 0 && (
        <div className="surface flex flex-wrap items-center justify-between gap-3 p-3.5">
          <span className="text-sm font-semibold">
            {selectedIds.length} tickets selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange("in_progress")}
              className="rounded-full bg-[var(--brand)] px-3.5 py-1.5 text-xs font-bold text-[var(--brand-on)] hover:bg-[var(--brand-hover)]"
            >
              Mark In Progress
            </button>
            <button
              onClick={() => handleBulkStatusChange("resolved")}
              className="rounded-full bg-[var(--success)] px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90"
            >
              Mark Resolved
            </button>
            <button
              onClick={() => handleBulkStatusChange("closed")}
              className="rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)] px-3.5 py-1.5 text-xs font-bold text-[var(--ink)] hover:bg-[var(--surface-3)]"
            >
              Mark Closed
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
          Loading request queue…
        </div>
      ) : filteredTickets.length === 0 ? (
        <section className="surface p-6 md:p-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-soft)]">
              <Search className="h-5 w-5 text-[var(--brand-ink)]" />
            </div>
            <h2 className="font-display text-xl font-bold">
              No requests found
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              {onlyMine
                ? "You haven't opened any requests yet."
                : "Try clearing a filter to widen the view, or start a new request."}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/tickets/new"
                className="group rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-5 text-left transition hover:border-[var(--brand)]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand)] text-[var(--brand-on)]">
                  <Plus className="h-4 w-4" />
                </span>
                <strong className="mt-4 block text-sm text-[var(--ink)]">
                  Open a new request
                </strong>
                <span className="mt-1.5 block text-xs leading-5 text-[var(--muted)]">
                  Use a category template and paste screenshots to describe
                  what is blocked.
                </span>
              </Link>
              <Link
                href="/faq"
                className="group rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-5 text-left transition hover:border-[var(--brand)]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-ink)]">
                  <Search className="h-4 w-4" />
                </span>
                <strong className="mt-4 block text-sm text-[var(--ink)]">
                  Search Knowledge first
                </strong>
                <span className="mt-1.5 block text-xs leading-5 text-[var(--muted)]">
                  VPN, model access, and GPU requests often already have
                  step-by-step answers.
                </span>
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket, idx) => {
            const isSelected = idx === selectedIndex;
            const isChecked = selectedIds.includes(ticket.id);

            return (
              <div
                key={ticket.id}
                onClick={() => router.push(`/tickets/${ticket.id}`)}
                className={cn(
                  "surface flex cursor-pointer items-center justify-between gap-4 p-4 transition hover:border-[var(--line-strong)]",
                  isSelected &&
                    "border-[var(--brand)] ring-2 ring-[var(--brand-soft)]"
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {isAgent && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectOne(ticket.id);
                      }}
                      aria-label={isChecked ? "Deselect ticket" : "Select ticket"}
                      className="text-[var(--muted)] hover:text-[var(--brand-ink)]"
                    >
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 text-[var(--brand)]" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  )}

                  <span className="shrink-0 font-mono text-xs font-semibold text-[var(--faint)]">
                    #{ticket.ticket_number}
                  </span>

                  <h3 className="truncate text-sm font-semibold text-[var(--ink)]">
                    {ticket.title}
                  </h3>

                  {ticket.priority === "urgent" && (
                    <StatusBadge
                      tone={priorityTone(ticket.priority)}
                      className="shrink-0"
                    >
                      P0 Urgent
                    </StatusBadge>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-4 text-xs">
                  <span className="hidden rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 font-mono text-[10px] font-semibold text-[var(--muted)] md:inline-flex">
                    {ticket.category}
                  </span>

                  <div className="hidden text-right sm:block">
                    <span className="block text-xs font-semibold leading-tight text-[var(--ink)]">
                      {ticket.author?.display_name || "Unknown Author"}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] text-[var(--faint)]">
                      {ticket.author?.user_type === "intern"
                        ? "Intern"
                        : "Staff"}
                    </span>
                  </div>

                  <span className="hidden w-16 text-right font-mono text-[10px] font-medium text-[var(--faint)] lg:block">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </span>

                  <StatusBadge tone={statusTone(ticket.status)}>
                    {ticket.status.replace("_", " ")}
                  </StatusBadge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  StatusBadge,
  statusTone,
  priorityTone,
} from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button, Select } from "@/components/ui/FormField";
import {
  AdminTable,
  AdminThead,
  AdminTh,
  AdminTd,
  TwoStepDelete,
  AdminToolbar,
} from "@/components/admin/table";
import { Search, Plus, ExternalLink } from "lucide-react";

const STATUSES = ["open", "in_progress", "resolved", "closed"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTickets = useCallback(async () => {
    setError("");
    const supabase = createClient();
    const { data, error: ticketError } = await supabase
      .from("tickets")
      .select(
        "*, author:profiles!tickets_author_id_fkey(id, display_name, department, user_type), assignee:profiles!tickets_assignee_id_fkey(id, display_name, department)"
      )
      .order("created_at", { ascending: false });
    if (ticketError) setError(`Could not load tickets: ${ticketError.message}`);
    else setTickets(data ?? []);

    const { data: agentData } = await supabase
      .from("profiles")
      .select("id, display_name, department")
      .in("role", ["support_agent", "admin"])
      .eq("account_status", "active");
    setAgents(agentData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const updateTicket = async (id: string, changes: Record<string, unknown>) => {
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tickets")
      .update(changes)
      .eq("id", id);
    if (updateError) {
      setError(`Update failed: ${updateError.message}`);
      return;
    }
    fetchTickets();
  };

  const softDeleteTicket = async (id: string) => {
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("soft_delete_ticket", {
      p_ticket_id: id,
    });
    if (rpcError) {
      setError(
        `Delete failed: ${rpcError.message} — apply the admin_crud migration to enable soft delete.`
      );
      return;
    }
    fetchTickets();
  };

  const filtered = tickets.filter((t) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      t.title.toLowerCase().includes(term) ||
      String(t.ticket_number).includes(term) ||
      (t.author?.display_name || "").toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Tickets"
        description="Every request across the desk. Edit status, priority, or assignee inline; deleting soft-removes the ticket."
        actions={
          <Link href="/tickets/new">
            <Button>
              <Plus className="h-4 w-4" /> New ticket
            </Button>
          </Link>
        }
      />

      {error && (
        <Alert tone="error" role="alert">
          {error}
        </Alert>
      )}

      <AdminToolbar>
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[var(--faint)]" />
          <input
            type="text"
            placeholder="Search number, title, or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--faint)] focus:border-[var(--brand)]"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="!w-auto"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </Select>
        <span className="font-mono text-xs text-[var(--faint)]">
          {filtered.length} of {tickets.length}
        </span>
      </AdminToolbar>

      {loading ? (
        <div className="py-16 text-center font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
          Loading tickets…
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface py-16 text-center text-sm text-[var(--muted)]">
          No tickets match this view.
        </div>
      ) : (
        <AdminTable
          header={
            <>
              <h2 className="font-display text-base font-bold">All tickets</h2>
              <StatusBadge tone="brand">{filtered.length} shown</StatusBadge>
            </>
          }
        >
          <AdminThead>
            <AdminTh>#</AdminTh>
            <AdminTh>Title</AdminTh>
            <AdminTh>Author</AdminTh>
            <AdminTh>Category</AdminTh>
            <AdminTh>Priority</AdminTh>
            <AdminTh>Status</AdminTh>
            <AdminTh>Assignee</AdminTh>
            <AdminTh>Created</AdminTh>
            <AdminTh className="text-right">Actions</AdminTh>
          </AdminThead>
          <tbody className="divide-y divide-[var(--line)]">
            {filtered.map((ticket) => (
              <tr key={ticket.id} className="transition hover:bg-[var(--surface-2)]">
                <AdminTd className="font-mono text-xs font-semibold text-[var(--faint)]">
                  #{ticket.ticket_number}
                </AdminTd>
                <AdminTd>
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="inline-flex max-w-[240px] items-center gap-1.5 text-sm font-semibold text-[var(--ink)] hover:text-[var(--brand-ink)]"
                    title="Open ticket"
                  >
                    <span className="truncate">{ticket.title}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-[var(--faint)]" />
                  </Link>
                </AdminTd>
                <AdminTd>
                  <span className="block text-xs font-medium text-[var(--ink)]">
                    {ticket.author?.display_name || "API"}
                  </span>
                  <span className="block font-mono text-[10px] text-[var(--faint)]">
                    {ticket.author?.department || "External"}
                  </span>
                </AdminTd>
                <AdminTd className="text-xs text-[var(--muted)]">
                  {ticket.category}
                </AdminTd>
                <AdminTd>
                  <select
                    value={ticket.priority}
                    onChange={(e) =>
                      updateTicket(ticket.id, { priority: e.target.value })
                    }
                    className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-xs font-medium text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </AdminTd>
                <AdminTd>
                  <select
                    value={ticket.status}
                    onChange={(e) =>
                      updateTicket(ticket.id, { status: e.target.value })
                    }
                    className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-xs font-medium text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </AdminTd>
                <AdminTd>
                  <select
                    value={ticket.assignee_id || ""}
                    onChange={(e) =>
                      updateTicket(ticket.id, {
                        assignee_id: e.target.value || null,
                      })
                    }
                    className="max-w-[150px] rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-xs font-medium text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.display_name}
                      </option>
                    ))}
                  </select>
                </AdminTd>
                <AdminTd className="whitespace-nowrap font-mono text-[11px] text-[var(--faint)]">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </AdminTd>
                <AdminTd className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <StatusBadge tone={statusTone(ticket.status)}>
                      {ticket.status.replace("_", " ")}
                    </StatusBadge>
                    {ticket.priority === "urgent" && (
                      <StatusBadge tone={priorityTone("urgent")}>
                        P0
                      </StatusBadge>
                    )}
                    <TwoStepDelete onConfirm={() => softDeleteTicket(ticket.id)} />
                  </div>
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </div>
  );
}

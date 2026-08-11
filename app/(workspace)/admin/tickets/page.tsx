"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Pencil, Plus, X } from "lucide-react";
import { useAdminResource } from "@/components/admin/useAdminResource";
import {
  AdminPagination,
  AdminResourceToolbar,
  AdminTable,
  AdminTableSkeleton,
  AdminLoadError,
  AdminTd,
  AdminTh,
  AdminThead,
  RestoreButton,
  TwoStepDelete,
} from "@/components/admin/table";
import { Alert } from "@/components/ui/Alert";
import { Button, FieldLabel, Input, Select, Textarea } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, priorityTone, statusTone } from "@/components/ui/StatusBadge";

const STATUSES = ["open", "in_progress", "resolved", "closed"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

export default function AdminTicketsPage() {
  const admin = useAdminResource("tickets");
  const [agents, setAgents] = useState<any[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/staff?pageSize=100")
      .then((response) => response.json())
      .then((payload) => setAgents((payload.rows ?? []).filter((profile: any) => ["admin", "super_admin"].includes(profile.role) && profile.account_status === "active")))
      .catch(() => setAgents([]));
    fetch("/api/admin/category-rules?pageSize=100&sort=category_name&direction=asc")
      .then((response) => response.json())
      .then((payload) => setActiveCategories(
        (payload.rows ?? []).map((rule: any) => rule.category_name)
      ))
      .catch(() => setActiveCategories([]));
  }, []);

  const categoryOptions = [...new Set([form.category, ...activeCategories])]
    .filter((value): value is string => Boolean(value));

  const startEdit = (ticket: any) => {
    setEditing(ticket);
    setForm({
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assignee_id: ticket.assignee_id ?? "",
      is_pinned: Boolean(ticket.is_pinned),
      pin_order: ticket.pin_order ?? 0,
      subtasksText: JSON.stringify(ticket.subtasks ?? [], null, 2),
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    let subtasks: unknown;
    try {
      subtasks = JSON.parse(form.subtasksText || "[]");
      if (!Array.isArray(subtasks)) throw new Error();
    } catch {
      admin.setError("Subtasks must be a valid JSON array.");
      return;
    }
    setSaving(true);
    const result = await admin.mutate({
      action: "update",
      id: editing.id,
      expectedUpdatedAt: editing.updated_at,
      data: {
        title: form.title,
        description: form.description,
        category: form.category,
        priority: form.priority,
        status: form.status,
        assignee_id: form.assignee_id || null,
        is_pinned: form.is_pinned,
        pin_order: Number(form.pin_order) || 0,
        subtasks,
      },
    });
    setSaving(false);
    if (result.ok) setEditing(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Tickets"
        description="Every request across the desk. Edit safe business fields, archive records, and restore deleted tickets."
        actions={<Link href="/tickets/new"><Button><Plus className="h-4 w-4" /> New ticket</Button></Link>}
      />
      <AdminLoadError message={admin.error} onRetry={admin.refresh} />
      {admin.notice && <Alert tone="success">{admin.notice}</Alert>}

      {editing && (
        <form onSubmit={save} className="surface grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <div className="flex items-center justify-between md:col-span-2">
            <div><h2 className="font-display text-base font-bold">Edit ticket #{editing.ticket_number}</h2><p className="mt-1 text-xs text-[var(--muted)]">Identity, requester, source, and audit timestamps stay read-only.</p></div>
            <button type="button" onClick={() => setEditing(null)} className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-2)]"><X className="h-4 w-4" /></button>
          </div>
          <label className="md:col-span-2"><FieldLabel>Title</FieldLabel><Input value={form.title ?? ""} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} required /></label>
          <label className="md:col-span-2"><FieldLabel>Description</FieldLabel><Textarea rows={5} value={form.description ?? ""} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} required /></label>
          <label><FieldLabel>Category</FieldLabel><Select value={form.category ?? ""} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))} required>{categoryOptions.map((categoryOption) => <option key={categoryOption} value={categoryOption}>{categoryOption}</option>)}</Select></label>
          <label><FieldLabel>Assignee</FieldLabel><Select value={form.assignee_id ?? ""} onChange={(event) => setForm((value) => ({ ...value, assignee_id: event.target.value }))}><option value="">Unassigned</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.display_name}</option>)}</Select></label>
          <label><FieldLabel>Priority</FieldLabel><Select value={form.priority ?? "medium"} onChange={(event) => setForm((value) => ({ ...value, priority: event.target.value }))}>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</Select></label>
          <label><FieldLabel>Status</FieldLabel><Select value={form.status ?? "open"} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}>{STATUSES.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</Select></label>
          <label><FieldLabel>Pin order</FieldLabel><Input type="number" value={form.pin_order ?? 0} onChange={(event) => setForm((value) => ({ ...value, pin_order: Number(event.target.value) }))} /></label>
          <label><FieldLabel>Pinned</FieldLabel><span className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--line-strong)] px-4"><input type="checkbox" checked={Boolean(form.is_pinned)} onChange={(event) => setForm((value) => ({ ...value, is_pinned: event.target.checked }))} /><span className="text-sm text-[var(--muted)]">Pin in the queue</span></span></label>
          <label className="md:col-span-2"><FieldLabel>Subtasks JSON</FieldLabel><Textarea rows={5} value={form.subtasksText ?? "[]"} onChange={(event) => setForm((value) => ({ ...value, subtasksText: event.target.value }))} className="font-mono text-xs" /></label>
          <div className="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={saving}><Check className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}</Button></div>
        </form>
      )}

      <AdminResourceToolbar q={admin.q} onQChange={admin.setQ} deleted={admin.deleted} onDeletedChange={admin.setDeleted} dateFrom={admin.dateFrom} dateTo={admin.dateTo} onDateFromChange={admin.setDateFrom} onDateToChange={admin.setDateTo}>
        <Select value={admin.filters.status ?? "all"} onChange={(event) => admin.setFilter("status", event.target.value)} className="!w-auto !py-2.5 !text-xs" aria-label="Status"><option value="all">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</Select>
        <Select value={admin.filters.priority ?? "all"} onChange={(event) => admin.setFilter("priority", event.target.value)} className="!w-auto !py-2.5 !text-xs" aria-label="Priority"><option value="all">All priorities</option>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</Select>
        <Select value={admin.filters.source ?? "all"} onChange={(event) => admin.setFilter("source", event.target.value)} className="!w-auto !py-2.5 !text-xs" aria-label="Source"><option value="all">All sources</option><option value="portal">Portal</option><option value="api">API</option></Select>
      </AdminResourceToolbar>

      {admin.loading && admin.rows.length === 0 ? <AdminTableSkeleton columns={9} /> : admin.error && admin.rows.length === 0 ? null : admin.rows.length === 0 ? <div className="surface py-16 text-center text-sm text-[var(--muted)]">No tickets match this view.</div> : (
        <AdminTable header={<><h2 className="font-display text-base font-bold">{admin.deleted ? "Deleted" : "Active"} tickets</h2><StatusBadge tone="brand">{admin.total} total</StatusBadge></>}>
          <AdminThead><AdminTh>#</AdminTh><AdminTh>Title</AdminTh><AdminTh>Requester</AdminTh><AdminTh>Category</AdminTh><AdminTh>Priority</AdminTh><AdminTh>Status</AdminTh><AdminTh>Assignee</AdminTh><AdminTh>Created</AdminTh><AdminTh className="text-right">Actions</AdminTh></AdminThead>
          <tbody className="divide-y divide-[var(--line)]">
            {admin.rows.map((ticket) => (
              <tr key={ticket.id} className="transition hover:bg-[var(--surface-2)]">
                <AdminTd className="font-mono text-xs text-[var(--faint)]">#{ticket.ticket_number}</AdminTd>
                <AdminTd><Link href={`/tickets/${ticket.id}`} className="inline-flex max-w-[240px] items-center gap-1.5 font-semibold hover:text-[var(--brand-ink)]"><span className="truncate">{ticket.title}</span><ExternalLink className="h-3 w-3 text-[var(--faint)]" /></Link></AdminTd>
                <AdminTd><span className="block text-xs font-medium">{ticket.author?.display_name ?? ticket.reporter_email ?? "API"}</span><span className="font-mono text-[10px] text-[var(--faint)]">{ticket.source}</span></AdminTd>
                <AdminTd className="text-xs text-[var(--muted)]">{ticket.category}</AdminTd>
                <AdminTd><StatusBadge tone={priorityTone(ticket.priority)}>{ticket.priority}</StatusBadge></AdminTd>
                <AdminTd><StatusBadge tone={statusTone(ticket.status)}>{ticket.status.replace("_", " ")}</StatusBadge></AdminTd>
                <AdminTd className="text-xs text-[var(--muted)]">{ticket.assignee?.display_name ?? "Unassigned"}</AdminTd>
                <AdminTd className="font-mono text-[11px] text-[var(--faint)]">{new Date(ticket.created_at).toLocaleDateString()}</AdminTd>
                <AdminTd className="text-right"><div className="flex items-center justify-end gap-2">{admin.deleted ? <RestoreButton onRestore={() => admin.mutate({ action: "restore", id: ticket.id })} /> : <><Button type="button" variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => startEdit(ticket)}><Pencil className="h-3.5 w-3.5" /> Edit</Button><TwoStepDelete onConfirm={() => admin.mutate({ action: "delete", id: ticket.id })} /></>}</div></AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
      <AdminPagination page={admin.page} pageSize={admin.pageSize} total={admin.total} onPageChange={admin.setPage} onPageSizeChange={admin.setPageSize} />
    </div>
  );
}

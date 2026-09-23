"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, MessageSquare, Pencil, Plus, X } from "lucide-react";
import { useAdminResource } from "@/components/admin/useAdminResource";
import {
  AdminPagination,
  AdminResourceToolbar,
  AdminTable,
  AdminTableSkeleton,
  AdminLoadError,
  AdminMobileList,
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
import { priorityLabel, ticketStatusLabel } from "@/lib/display-labels";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { createClient } from "@/lib/supabase/client";

import { SubtaskEditor, type EditableSubtask } from "@/components/tickets/SubtaskEditor";
import { setPortalMode } from "@/lib/portal-mode";

const STATUSES = ["open", "in_progress", "resolved", "closed"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

export default function AdminTicketsPage() {
  const admin = useAdminResource("tickets");
  const [agents, setAgents] = useState<any[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [subtasks, setSubtasks] = useState<EditableSubtask[]>([]);
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
    void createClient()
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setDepartments(data ?? []));
  }, []);

  const categoryOptions = [...new Set([form.category, ...activeCategories])]
    .filter((value): value is string => Boolean(value));

  const startEdit = (ticket: any) => {
    setEditing(ticket);
    setSubtasks(Array.isArray(ticket.subtasks) ? ticket.subtasks : []);
    setForm({
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      department_id: ticket.department_id ?? "",
      assignee_id: ticket.assignee_id ?? "",
      is_pinned: Boolean(ticket.is_pinned),
      pin_order: ticket.pin_order ?? 0,
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    if (subtasks.some(task => !task.title.trim())) {
      admin.setError("Give each subtask a title, or remove the empty step.");
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
        department_id: form.department_id,
        assignee_id: form.assignee_id || null,
        is_pinned: form.is_pinned,
        pin_order: Number(form.pin_order) || 0,
        subtasks: subtasks.map(task => ({ ...task, title: task.title.trim() })),
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
        description="Open a conversation to help the requester, or edit the details to keep the ticket up to date."
        actions={<Link href="/tickets/new"><Button><Plus className="h-4 w-4" /> New ticket</Button></Link>}
      />
      <AdminLoadError message={admin.error} onRetry={admin.refresh} />
      {admin.notice && <Alert tone="success">{admin.notice}</Alert>}

      {editing && (
        <form onSubmit={save} className="surface grid grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-2">
          <div className="flex items-center justify-between md:col-span-2">
            <div><h2 className="font-display text-base font-bold">Edit ticket #{editing.ticket_number}</h2><p className="mt-1 text-xs text-[var(--muted)]">Update ticket details here. Use the conversation to exchange updates with the requester.</p></div>
            <button type="button" aria-label="Close ticket editor" onClick={() => setEditing(null)} className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-2)]"><X className="h-4 w-4" /></button>
          </div>
          <Link href={`/tickets/${editing.id}#conversation`} onClick={() => setPortalMode("admin")} className="ticket-discussion-link md:col-span-2"><MessageSquare size={18} /><span><strong>Open conversation</strong><span>Read updates and reply to the requester</span></span><ExternalLink size={15} /></Link>
          <label className="md:col-span-2"><FieldLabel>Title</FieldLabel><Input value={form.title ?? ""} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} required /></label>
          <label className="md:col-span-2"><FieldLabel>Description</FieldLabel><Textarea rows={5} value={form.description ?? ""} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} required /></label>
          <label><FieldLabel>Category</FieldLabel><Select value={form.category ?? ""} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))} required>{categoryOptions.map((categoryOption) => <option key={categoryOption} value={categoryOption}>{categoryOption}</option>)}</Select></label>
          <label><FieldLabel>Assignee</FieldLabel><Select value={form.assignee_id ?? ""} onChange={(event) => setForm((value) => ({ ...value, assignee_id: event.target.value }))}><option value="">Unassigned</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.display_name}</option>)}</Select></label>
          <label><FieldLabel>Ticket department</FieldLabel><Select value={form.department_id ?? ""} onChange={(event) => setForm((value) => ({ ...value, department_id: event.target.value }))} required><option value="" disabled>Select a department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select><span className="mt-2 block text-xs text-[var(--muted)]">Changing this controls which department can read the request; the original author keeps access.</span></label>
          <label><FieldLabel>Priority</FieldLabel><Select value={form.priority ?? "medium"} onChange={(event) => setForm((value) => ({ ...value, priority: event.target.value }))}>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}</Select></label>
          <label><FieldLabel>Status</FieldLabel><Select value={form.status ?? "open"} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}>{STATUSES.map((status) => <option key={status} value={status}>{ticketStatusLabel(status)}</option>)}</Select></label>
          <label><FieldLabel>Pin order</FieldLabel><Input type="number" value={form.pin_order ?? 0} onChange={(event) => setForm((value) => ({ ...value, pin_order: Number(event.target.value) }))} /></label>
          <label><FieldLabel>Pinned</FieldLabel><span className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--line-strong)] px-4"><input type="checkbox" checked={Boolean(form.is_pinned)} onChange={(event) => setForm((value) => ({ ...value, is_pinned: event.target.checked }))} /><span className="text-sm text-[var(--muted)]">Pin in the queue</span></span></label>
          <SubtaskEditor value={subtasks} onChange={setSubtasks} disabled={saving} />
          <div className="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={saving}><Check className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}</Button></div>
        </form>
      )}

      <AdminResourceToolbar q={admin.q} onQChange={admin.setQ} deleted={admin.deleted} onDeletedChange={admin.setDeleted} dateFrom={admin.dateFrom} dateTo={admin.dateTo} onDateFromChange={admin.setDateFrom} onDateToChange={admin.setDateTo}>
        <Select value={admin.filters.status ?? "all"} onChange={(event) => admin.setFilter("status", event.target.value)} className="!w-auto !py-2.5 !text-xs" aria-label="Status"><option value="all">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{ticketStatusLabel(status)}</option>)}</Select>
        <Select value={admin.filters.priority ?? "all"} onChange={(event) => admin.setFilter("priority", event.target.value)} className="!w-auto !py-2.5 !text-xs" aria-label="Priority"><option value="all">All priorities</option>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}</Select>
        <Select value={admin.filters.source ?? "all"} onChange={(event) => admin.setFilter("source", event.target.value)} className="!w-auto !py-2.5 !text-xs" aria-label="Source"><option value="all">All sources</option><option value="portal">Portal</option><option value="api">API</option></Select>
      </AdminResourceToolbar>

      {admin.loading && admin.rows.length === 0 ? <AdminTableSkeleton columns={9} /> : admin.error && admin.rows.length === 0 ? null : admin.rows.length === 0 ? <ListEmptyState title={admin.q || Object.values(admin.filters).some((value) => value && value !== "all") ? "No matching tickets" : "No tickets yet"} description={admin.q || Object.values(admin.filters).some((value) => value && value !== "all") ? "Try a broader search or reset the active filters." : "New portal and API requests will appear here."} /> : (
        <AdminTable
          header={<><h2 className="font-display text-base font-bold">{admin.deleted ? "Deleted" : "Active"} tickets</h2><StatusBadge tone="brand">{admin.total} total</StatusBadge></>}
          mobile={<AdminMobileList items={admin.rows.map((ticket) => ({
            id: String(ticket.id),
            title: `#${ticket.ticket_number} ${ticket.title}`,
            subtitle: `${ticket.author?.display_name ?? ticket.reporter_email ?? "API"} · ${ticket.category}`,
            badges: <><StatusBadge tone={priorityTone(ticket.priority)}>{priorityLabel(ticket.priority)}</StatusBadge><StatusBadge tone={statusTone(ticket.status)}>{ticketStatusLabel(ticket.status)}</StatusBadge></>,
            fields: [
              { label: "Requester", value: ticket.author?.display_name ?? ticket.reporter_email ?? "API" },
              { label: "Source", value: ticket.source },
              { label: "Category", value: ticket.category },
              { label: "Priority", value: priorityLabel(ticket.priority) },
              { label: "Status", value: ticketStatusLabel(ticket.status) },
              { label: "Assignee", value: ticket.assignee?.display_name ?? "Unassigned" },
              { label: "Created", value: new Date(ticket.created_at).toLocaleString() },
            ],
            actions: (close) => admin.deleted ? <RestoreButton onRestore={async () => { await admin.mutate({ action: "restore", id: ticket.id }); close(); }} /> : <><Link href={`/tickets/${ticket.id}#conversation`} onClick={() => { setPortalMode("admin"); close(); }}><Button type="button" variant="secondary" className="w-full"><MessageSquare className="h-4 w-4" /> Open conversation</Button></Link><Button type="button" variant="secondary" onClick={() => { startEdit(ticket); close(); }}><Pencil className="h-4 w-4" /> Edit</Button><TwoStepDelete onConfirm={async () => { await admin.mutate({ action: "delete", id: ticket.id }); close(); }} /></>,
          }))} />}
        >
          <AdminThead><AdminTh>#</AdminTh><AdminTh>Title</AdminTh><AdminTh>Requester</AdminTh><AdminTh>Category</AdminTh><AdminTh>Priority</AdminTh><AdminTh>Status</AdminTh><AdminTh>Assignee</AdminTh><AdminTh>Created</AdminTh><AdminTh className="text-right">Actions</AdminTh></AdminThead>
          <tbody className="divide-y divide-[var(--line)]">
            {admin.rows.map((ticket) => (
              <tr key={ticket.id} className="transition hover:bg-[var(--surface-2)]">
                <AdminTd className="font-mono text-xs text-[var(--faint)]">#{ticket.ticket_number}</AdminTd>
                <AdminTd><Link href={`/tickets/${ticket.id}`} className="inline-flex max-w-[240px] items-center gap-1.5 font-semibold hover:text-[var(--brand-ink)]"><span className="truncate">{ticket.title}</span><ExternalLink className="h-3 w-3 text-[var(--faint)]" /></Link></AdminTd>
                <AdminTd><span className="block text-xs font-medium">{ticket.author?.display_name ?? ticket.reporter_email ?? "API"}</span><span className="font-mono text-xs text-[var(--faint)]">{ticket.source}</span></AdminTd>
                <AdminTd className="text-xs text-[var(--muted)]">{ticket.category}</AdminTd>
                <AdminTd><StatusBadge tone={priorityTone(ticket.priority)}>{priorityLabel(ticket.priority)}</StatusBadge></AdminTd>
                <AdminTd><StatusBadge tone={statusTone(ticket.status)}>{ticketStatusLabel(ticket.status)}</StatusBadge></AdminTd>
                <AdminTd className="text-xs text-[var(--muted)]">{ticket.assignee?.display_name ?? "Unassigned"}</AdminTd>
                <AdminTd className="font-mono text-xs text-[var(--faint)]">{new Date(ticket.created_at).toLocaleDateString()}</AdminTd>
                <AdminTd className="text-right"><div className="flex items-center justify-end gap-2">{admin.deleted ? <RestoreButton onRestore={() => admin.mutate({ action: "restore", id: ticket.id })} /> : <><Link href={`/tickets/${ticket.id}#conversation`} onClick={() => setPortalMode("admin")} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-soft)] px-3 py-2 text-xs font-medium text-[var(--brand-ink)]"><MessageSquare size={14} /> Conversation</Link><Button type="button" variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => startEdit(ticket)}><Pencil className="h-3.5 w-3.5" /> Edit</Button><TwoStepDelete onConfirm={() => admin.mutate({ action: "delete", id: ticket.id })} /></>}</div></AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
      <AdminPagination page={admin.page} pageSize={admin.pageSize} total={admin.total} onPageChange={admin.setPage} onPageSizeChange={admin.setPageSize} />
    </div>
  );
}

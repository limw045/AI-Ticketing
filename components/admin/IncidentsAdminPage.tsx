"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { runAdminMutation } from "@/app/(workspace)/admin/actions";
import {
  AdminLoadError,
  AdminMobileList,
  AdminPagination,
  AdminResourceToolbar,
  AdminTable,
  AdminTableSkeleton,
  AdminTd,
  AdminTh,
  AdminThead,
  RestoreButton,
  TwoStepDelete,
} from "@/components/admin/table";
import { Alert } from "@/components/ui/Alert";
import { Button, FieldLabel, Input, Select, Textarea } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, severityTone } from "@/components/ui/StatusBadge";
import {
  booleanToIncidentStatus,
  buildIncidentListParams,
  clampIncidentPage,
  incidentStatusToBoolean,
  readIncidentPageSize,
  type IncidentPageSize,
  type IncidentStatus,
} from "@/lib/admin/incident-view";
import type { AdminActionResult, PaginatedResult } from "@/lib/admin/types";

interface IncidentRow {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  is_active: boolean;
  updated_at: string;
}

interface SectionState {
  rows: IncidentRow[];
  total: number;
  loading: boolean;
  error: string;
}

interface IncidentForm {
  title: string;
  severity: IncidentRow["severity"];
  message: string;
  status: IncidentStatus;
}

const emptySection: SectionState = { rows: [], total: 0, loading: true, error: "" };
const emptyForm: IncidentForm = { title: "", severity: "warning", message: "", status: "active" };

function readPositivePage(value: string | null) {
  return Math.max(1, Number(value) || 1);
}

function IncidentFields({ form, setForm }: { form: IncidentForm; setForm: React.Dispatch<React.SetStateAction<IncidentForm>> }) {
  return (
    <>
      <label><FieldLabel>Title</FieldLabel><Input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
      <label><FieldLabel>Severity</FieldLabel><Select required value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value as IncidentRow["severity"] }))}><option value="info">Information</option><option value="warning">Warning</option><option value="critical">Critical</option></Select></label>
      <label><FieldLabel>Status</FieldLabel><Select required value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as IncidentStatus }))}><option value="active">Active</option><option value="resolved">Resolved</option></Select></label>
      <label className="md:col-span-2"><FieldLabel>Message</FieldLabel><Textarea rows={5} required value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} /></label>
    </>
  );
}

function IncidentSection({
  title,
  state,
  page,
  pageSize,
  deleted,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onRestore,
  onRetry,
}: {
  title: string;
  state: SectionState;
  page: number;
  pageSize: IncidentPageSize;
  deleted: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: IncidentPageSize) => void;
  onEdit: (row: IncidentRow) => void;
  onDelete: (row: IncidentRow) => Promise<void>;
  onRestore: (row: IncidentRow) => Promise<void>;
  onRetry: () => void;
}) {
  if (state.loading && state.rows.length === 0) return <AdminTableSkeleton columns={6} />;
  if (state.error && state.rows.length === 0) return <AdminLoadError message={state.error} onRetry={onRetry} />;

  const mobileItems = state.rows.map((incident) => ({
    id: incident.id,
    title: incident.title,
    subtitle: incident.message,
    badges: <><StatusBadge tone={incident.is_active ? "success" : "neutral"}>{incident.is_active ? "Active" : "Resolved"}</StatusBadge><StatusBadge tone={severityTone(incident.severity)}>{incident.severity}</StatusBadge></>,
    fields: [
      { label: "Message", value: incident.message },
      { label: "Severity", value: incident.severity },
      { label: "Status", value: incident.is_active ? "Active" : "Resolved" },
      { label: "Updated", value: new Date(incident.updated_at).toLocaleString() },
    ],
    actions: (close: () => void) => deleted ? (
      <RestoreButton onRestore={async () => { await onRestore(incident); close(); }} />
    ) : (
      <><Button type="button" variant="secondary" onClick={() => { onEdit(incident); close(); }}><Pencil className="h-4 w-4" /> Edit</Button><TwoStepDelete onConfirm={async () => { await onDelete(incident); close(); }} /></>
    ),
  }));

  return (
    <div className="space-y-3">
      {state.error && <AdminLoadError message={state.error} onRetry={onRetry} />}
      <AdminTable
        header={<><h2 className="font-display text-base font-bold">{title}</h2><StatusBadge tone="neutral">{state.total} total</StatusBadge></>}
        mobile={state.rows.length ? <AdminMobileList items={mobileItems} /> : undefined}
      >
        <AdminThead><AdminTh>Title</AdminTh><AdminTh>Message</AdminTh><AdminTh>Severity</AdminTh><AdminTh>Status</AdminTh><AdminTh>Updated</AdminTh><AdminTh className="text-right">Actions</AdminTh></AdminThead>
        <tbody className="divide-y divide-[var(--line)]">
          {state.rows.length === 0 ? <tr><td className="px-4 py-12 text-center text-sm text-[var(--muted)]" colSpan={6}>No incidents match this view.</td></tr> : state.rows.map((incident) => (
            <tr key={incident.id} className="transition hover:bg-[var(--surface-2)]">
              <AdminTd><span className="text-sm font-semibold">{incident.title}</span></AdminTd>
              <AdminTd><span className="block max-w-[320px] truncate text-xs text-[var(--muted)]">{incident.message}</span></AdminTd>
              <AdminTd><StatusBadge tone={severityTone(incident.severity)}>{incident.severity}</StatusBadge></AdminTd>
              <AdminTd><StatusBadge tone={incident.is_active ? "success" : "neutral"}>{incident.is_active ? "Active" : "Resolved"}</StatusBadge></AdminTd>
              <AdminTd className="whitespace-nowrap font-mono text-xs text-[var(--faint)]">{new Date(incident.updated_at).toLocaleString()}</AdminTd>
              <AdminTd className="text-right"><div className="flex items-center justify-end gap-2">{deleted ? <RestoreButton onRestore={() => onRestore(incident)} /> : <><Button type="button" variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => onEdit(incident)}><Pencil className="h-3.5 w-3.5" /> Edit</Button><TwoStepDelete onConfirm={() => onDelete(incident)} /></>}</div></AdminTd>
            </tr>
          ))}
        </tbody>
      </AdminTable>
      <AdminPagination page={page} pageSize={pageSize} total={state.total} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
    </div>
  );
}

export function IncidentsAdminPage() {
  const [hydrated, setHydrated] = useState(false);
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [activePageSize, setActivePageSize] = useState<IncidentPageSize>(25);
  const [resolvedPage, setResolvedPage] = useState(1);
  const [resolvedPageSize, setResolvedPageSize] = useState<IncidentPageSize>(25);
  const [deletedPage, setDeletedPage] = useState(1);
  const [deletedPageSize, setDeletedPageSize] = useState<IncidentPageSize>(25);
  const [active, setActive] = useState<SectionState>(emptySection);
  const [resolved, setResolved] = useState<SectionState>(emptySection);
  const [deletedRecords, setDeletedRecords] = useState<SectionState>(emptySection);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<IncidentRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<IncidentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [mutationError, setMutationError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQ(params.get("q") ?? ""); setSeverity(params.get("severity") ?? "all"); setDateFrom(params.get("dateFrom") ?? ""); setDateTo(params.get("dateTo") ?? ""); setDeleted(params.get("deleted") === "true");
    setActivePage(readPositivePage(params.get("activePage"))); setActivePageSize(readIncidentPageSize(params.get("activePageSize")));
    setResolvedPage(readPositivePage(params.get("resolvedPage"))); setResolvedPageSize(readIncidentPageSize(params.get("resolvedPageSize")));
    setDeletedPage(readPositivePage(params.get("deletedPage"))); setDeletedPageSize(readIncidentPageSize(params.get("deletedPageSize")));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams();
    if (q) params.set("q", q); if (severity !== "all") params.set("severity", severity); if (dateFrom) params.set("dateFrom", dateFrom); if (dateTo) params.set("dateTo", dateTo); if (deleted) params.set("deleted", "true");
    params.set("activePage", String(activePage)); params.set("activePageSize", String(activePageSize)); params.set("resolvedPage", String(resolvedPage)); params.set("resolvedPageSize", String(resolvedPageSize)); params.set("deletedPage", String(deletedPage)); params.set("deletedPageSize", String(deletedPageSize));
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [activePage, activePageSize, dateFrom, dateTo, deleted, deletedPage, deletedPageSize, hydrated, q, resolvedPage, resolvedPageSize, severity]);

  const loadSection = useCallback(async (status: IncidentStatus | undefined, page: number, pageSize: IncidentPageSize, setter: React.Dispatch<React.SetStateAction<SectionState>>, signal?: AbortSignal) => {
    setter((current) => ({ ...current, loading: true, error: "" }));
    try {
      const params = buildIncidentListParams({ q, severity, dateFrom, dateTo, deleted, status, page, pageSize });
      const response = await fetch(`/api/admin/incidents?${params}`, { cache: "no-store", signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load incidents.");
      const result = payload as PaginatedResult<IncidentRow>;
      const validPage = clampIncidentPage(page, result.total, pageSize);
      if (validPage !== page) {
        if (status === "active") setActivePage(validPage); else if (status === "resolved") setResolvedPage(validPage); else setDeletedPage(validPage);
        return;
      }
      setter({ rows: result.rows, total: result.total, loading: false, error: "" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setter((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : "Could not load incidents." }));
    }
  }, [dateFrom, dateTo, deleted, q, severity]);

  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (deleted) void loadSection(undefined, deletedPage, deletedPageSize, setDeletedRecords, controller.signal);
      else {
        void loadSection("active", activePage, activePageSize, setActive, controller.signal);
        void loadSection("resolved", resolvedPage, resolvedPageSize, setResolved, controller.signal);
      }
    }, q ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [activePage, activePageSize, deleted, deletedPage, deletedPageSize, hydrated, loadSection, q, refreshKey, resolvedPage, resolvedPageSize]);

  const resetSharedPages = () => { setActivePage(1); setResolvedPage(1); setDeletedPage(1); };
  const mutate = async (input: Parameters<typeof runAdminMutation>[0]) => {
    setMutationError(""); setNotice("");
    const result: AdminActionResult = await runAdminMutation(input);
    if (!result.ok) { setMutationError(result.message); return result; }
    setNotice(result.message ?? "Saved."); setRefreshKey((current) => current + 1); return result;
  };
  const startCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); setMutationError(""); };
  const startEdit = (row: IncidentRow) => { setEditing(row); setForm({ title: row.title, severity: row.severity, message: row.message, status: booleanToIncidentStatus(row.is_active) }); setShowForm(true); setMutationError(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    const result = await mutate({ resource: "incidents", action: editing ? "update" : "create", id: editing?.id, expectedUpdatedAt: editing?.updated_at, data: { title: form.title, severity: form.severity, message: form.message, is_active: incidentStatusToBoolean(form.status) } });
    setSaving(false); if (result.ok) { setShowForm(false); setEditing(null); }
  };

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Administration" title="Incidents" description="Publish, resolve, edit, delete, and restore the global outage banners every staff member sees." actions={<Button type="button" onClick={startCreate}><Plus className="h-4 w-4" /> Add Incident</Button>} />
      {mutationError && <Alert tone="error" role="alert">{mutationError}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}
      {showForm && <form onSubmit={submit} className="surface grid grid-cols-1 gap-4 p-6 md:grid-cols-2"><div className="flex items-center justify-between md:col-span-2"><div><h2 className="font-display text-base font-bold">{editing ? "Edit Incident" : "Add Incident"}</h2><p className="mt-1 text-xs text-[var(--muted)]">Active incidents appear in the global service-status banner.</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close form" className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-2)]"><X className="h-4 w-4" /></button></div><IncidentFields form={form} setForm={setForm} /><div className="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={saving}><Check className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}</Button></div></form>}
      <AdminResourceToolbar q={q} onQChange={(value) => { setQ(value); resetSharedPages(); }} deleted={deleted} onDeletedChange={(value) => { setDeleted(value); resetSharedPages(); }} dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={(value) => { setDateFrom(value); resetSharedPages(); }} onDateToChange={(value) => { setDateTo(value); resetSharedPages(); }}><Select value={severity} onChange={(event) => { setSeverity(event.target.value); resetSharedPages(); }} aria-label="Severity" className="!w-auto !py-2.5 !text-xs"><option value="all">All severity</option><option value="info">Information</option><option value="warning">Warning</option><option value="critical">Critical</option></Select></AdminResourceToolbar>
      {deleted ? <IncidentSection title="Deleted incidents" state={deletedRecords} page={deletedPage} pageSize={deletedPageSize} deleted onPageChange={setDeletedPage} onPageSizeChange={(size) => { setDeletedPageSize(size); setDeletedPage(1); }} onEdit={startEdit} onDelete={async () => {}} onRestore={async (row) => { await mutate({ resource: "incidents", action: "restore", id: row.id }); }} onRetry={() => setRefreshKey((current) => current + 1)} /> : <><IncidentSection title="Active incidents" state={active} page={activePage} pageSize={activePageSize} deleted={false} onPageChange={setActivePage} onPageSizeChange={(size) => { setActivePageSize(size); setActivePage(1); }} onEdit={startEdit} onDelete={async (row) => { await mutate({ resource: "incidents", action: "delete", id: row.id }); }} onRestore={async () => {}} onRetry={() => void loadSection("active", activePage, activePageSize, setActive)} /><IncidentSection title="Resolved incidents" state={resolved} page={resolvedPage} pageSize={resolvedPageSize} deleted={false} onPageChange={setResolvedPage} onPageSizeChange={(size) => { setResolvedPageSize(size); setResolvedPage(1); }} onEdit={startEdit} onDelete={async (row) => { await mutate({ resource: "incidents", action: "delete", id: row.id }); }} onRestore={async () => {}} onRetry={() => void loadSection("resolved", resolvedPage, resolvedPageSize, setResolved)} /></>}
    </div>
  );
}

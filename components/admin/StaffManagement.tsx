"use client";

import { useEffect, useState } from "react";
import { RegistrationLink } from "@/components/admin/RegistrationLink";
import { Check, Pencil, X } from "lucide-react";
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
import { Button, FieldLabel, Input, Select } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { canManageProfile, canManageRole, type WorkspaceRole } from "@/lib/admin/types";
import { createClient } from "@/lib/supabase/client";
import { DepartmentManagement } from "@/components/admin/DepartmentManagement";
import { accountStatusLabel, accountTypeLabel, roleLabel } from "@/lib/display-labels";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { formatDate } from "@/lib/date-display";

export function StaffManagement({ administratorsOnly = false }: { administratorsOnly?: boolean }) {
  const admin = useAdminResource("staff");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [view, setView] = useState<"people" | "departments">("people");
  const hasFilters = Boolean(admin.q || admin.dateFrom || admin.dateTo || admin.deleted || Object.entries(admin.filters).some(([key, value]) => key !== "role_group" && value && value !== "all"));
  const clearVisibleFilters = () => { admin.clearFilters(); if (administratorsOnly) admin.setFilter("role_group", "administrators"); };

  useEffect(() => {
    if (administratorsOnly) admin.setFilter("role_group", "administrators");
    // The resource hook is stable enough for this one-time scope initialization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [administratorsOnly]);

  useEffect(() => {
    void createClient().from("departments").select("id, name").eq("is_active", true).eq("is_system", false).order("name").then(({ data }) => setDepartments(data ?? []));
  }, []);

  const startEdit = (row: any) => {
    setEditing(row);
    setForm({
      display_name: row.display_name,
      department_id: row.department_id,
      user_type: row.user_type,
      supervisor_name: row.supervisor_name ?? "",
      role: row.role,
      account_status: row.account_status,
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    const result = await admin.mutate({
      action: "update",
      id: editing.id,
      expectedUpdatedAt: editing.updated_at,
      data: form,
    });
    setSaving(false);
    if (result.ok) setEditing(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={administratorsOnly ? "Super Administration" : "Administration"}
        title={administratorsOnly ? "Admin management" : "Staff access & roles"}
        description={
          administratorsOnly
            ? "Manage privileged administrator access. Self-management and removal of the final active Super Admin are blocked."
            : "Manage Employee profile details and access. Administrator accounts remain read-only unless you are a Super Admin."
        }
      />

      {!administratorsOnly && admin.viewerRole === "super_admin" && <div className="inline-flex w-fit rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1">
        <button type="button" onClick={() => setView("people")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === "people" ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]" : "text-[var(--muted)]"}`}>People</button>
        <button type="button" onClick={() => setView("departments")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${view === "departments" ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]" : "text-[var(--muted)]"}`}>Departments</button>
      </div>}

      {view === "departments" && admin.viewerRole === "super_admin" ? <DepartmentManagement /> : <>

      <AdminLoadError message={admin.error} onRetry={admin.refresh} />
      {admin.notice && <Alert tone="success">{admin.notice}</Alert>}

      {!administratorsOnly && <RegistrationLink />}

      {editing && (
        <form onSubmit={save} className="surface grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <div className="flex items-center justify-between md:col-span-2">
            <div>
              <h2 className="font-display text-base font-bold">Edit {editing.display_name}</h2>
              <p className="mt-1 font-mono text-xs text-[var(--faint)]">{editing.email}</p>
            </div>
            <button type="button" onClick={() => setEditing(null)} className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-2)]"><X className="h-4 w-4" /></button>
          </div>
          <label><FieldLabel>Display name</FieldLabel><Input value={String(form.display_name ?? "")} onChange={(event) => setForm((value) => ({ ...value, display_name: event.target.value }))} required /></label>
          <label><FieldLabel>Department</FieldLabel><Select value={String(form.department_id ?? "")} onChange={(event) => setForm((value) => ({ ...value, department_id: event.target.value }))} required>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select></label>
          <label><FieldLabel>Staff type</FieldLabel><Select value={String(form.user_type ?? "full_time")} onChange={(event) => setForm((value) => ({ ...value, user_type: event.target.value }))}><option value="full_time">Full-time</option><option value="intern">Intern</option><option value="contractor">Contractor</option></Select></label>
          <label><FieldLabel>Supervisor</FieldLabel><Input value={String(form.supervisor_name ?? "")} onChange={(event) => setForm((value) => ({ ...value, supervisor_name: event.target.value || null }))} placeholder="Required for interns" /></label>
          <label><FieldLabel>Role</FieldLabel><Select disabled={!canManageRole(admin.viewerRole, editing.id === admin.viewerId)} value={String(form.role)} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value }))}><option value="employee">Employee</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option></Select></label>
          <label><FieldLabel>Account status</FieldLabel><Select value={String(form.account_status)} onChange={(event) => setForm((value) => ({ ...value, account_status: event.target.value }))}><option value="active">Active</option><option value="suspended">Suspended</option></Select></label>
          <div className="flex justify-end gap-2 md:col-span-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={saving}><Check className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}</Button></div>
        </form>
      )}

      <AdminResourceToolbar q={admin.q} onQChange={admin.setQ} deleted={admin.deleted} onDeletedChange={admin.setDeleted} dateFrom={admin.dateFrom} dateTo={admin.dateTo} onDateFromChange={admin.setDateFrom} onDateToChange={admin.setDateTo}>
        {!administratorsOnly && <Select value={admin.filters.role ?? "all"} onChange={(event) => admin.setFilter("role", event.target.value)} className="!w-auto !py-2.5 !text-[13px]" aria-label="Role"><option value="all">All roles</option><option value="employee">Employee</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option></Select>}
        <Select value={admin.filters.account_status ?? "all"} onChange={(event) => admin.setFilter("account_status", event.target.value)} className="!w-auto !py-2.5 !text-[13px]" aria-label="Account status"><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></Select>
        <Select value={admin.filters.user_type ?? "all"} onChange={(event) => admin.setFilter("user_type", event.target.value)} className="!w-auto !py-2.5 !text-[13px]" aria-label="Staff type"><option value="all">All staff types</option><option value="full_time">Full-time</option><option value="intern">Intern</option><option value="contractor">Contractor</option></Select>
      </AdminResourceToolbar>

      {admin.loading && admin.rows.length === 0 ? <AdminTableSkeleton columns={7} /> : admin.error && admin.rows.length === 0 ? null : admin.rows.length === 0 ? <ListEmptyState title={hasFilters ? "No matching staff" : administratorsOnly ? "No administrators yet" : "No staff accounts yet"} description={hasFilters ? "Try a broader search or reset the active filters." : administratorsOnly ? "Privileged accounts will appear here when an administrator is assigned." : "Share the registration link above so staff can create their accounts."} actionLabel={hasFilters ? "Clear filters" : undefined} onAction={hasFilters ? clearVisibleFilters : undefined} /> : (
        <AdminTable
          header={<><h2 className="font-display text-base font-bold">{admin.deleted ? "Deleted" : "Active"} {administratorsOnly ? "administrators" : "staff accounts"}</h2><StatusBadge tone="neutral">{admin.total} total</StatusBadge></>}
          mobile={
            <AdminMobileList
              items={admin.rows.map((row) => {
                const canManage = canManageProfile(admin.viewerRole, row.role as WorkspaceRole, row.id === admin.viewerId);
                return {
                  id: String(row.id),
                  title: `${row.display_name}${row.id === admin.viewerId ? " (You)" : ""}`,
                  subtitle: row.email,
                  badges: <><StatusBadge tone={row.account_status === "active" ? "success" : "danger"}>{accountStatusLabel(row.account_status)}</StatusBadge><StatusBadge tone={row.role === "super_admin" ? "brand" : "neutral"}>{roleLabel(row.role)}</StatusBadge></>,
                  fields: [
                    { label: "Department", value: row.department },
                    { label: "Staff type", value: accountTypeLabel(row.user_type) },
                    { label: "Role", value: roleLabel(row.role) },
                    { label: "Status", value: accountStatusLabel(row.account_status) },
                    { label: "Joined", value: formatDate(row.created_at) },
                  ],
                  actions: (close) => canManage ? admin.deleted ? <RestoreButton onRestore={async () => { await admin.mutate({ action: "restore", id: row.id }); close(); }} /> : <><Button type="button" variant="secondary" onClick={() => { startEdit(row); close(); }}><Pencil className="h-4 w-4" /> Edit</Button><TwoStepDelete onConfirm={async () => { await admin.mutate({ action: "delete", id: row.id }); close(); }} /></> : <span className="py-2 text-center font-mono text-xs text-[var(--faint)]">Read only</span>,
                };
              })}
            />
          }
        >
          <AdminThead><AdminTh>Name</AdminTh><AdminTh>Department</AdminTh><AdminTh>Type</AdminTh><AdminTh>Role</AdminTh><AdminTh>Status</AdminTh><AdminTh>Joined</AdminTh><AdminTh className="text-right">Actions</AdminTh></AdminThead>
          <tbody className="divide-y divide-[var(--line)]">
            {admin.rows.map((row) => {
              const canManage = canManageProfile(admin.viewerRole, row.role as WorkspaceRole, row.id === admin.viewerId);
              return (
                <tr key={row.id} className="transition hover:bg-[var(--surface-2)]">
                  <AdminTd><span className="block text-sm font-semibold">{row.display_name}{row.id === admin.viewerId && <span className="ml-2 rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-xs text-[var(--brand-ink)]">You</span>}</span><span className="block font-mono text-xs text-[var(--faint)]">{row.email}</span></AdminTd>
                  <AdminTd className="text-xs text-[var(--muted)]">{row.department}</AdminTd>
                  <AdminTd><StatusBadge tone={row.user_type === "intern" ? "warning" : "neutral"}>{accountTypeLabel(row.user_type)}</StatusBadge></AdminTd>
                  <AdminTd><StatusBadge tone={row.role === "super_admin" ? "brand" : "neutral"}>{roleLabel(row.role)}</StatusBadge></AdminTd>
                  <AdminTd><StatusBadge tone={row.account_status === "active" ? "success" : "danger"}>{accountStatusLabel(row.account_status)}</StatusBadge></AdminTd>
                  <AdminTd className="whitespace-nowrap text-[13px] text-[var(--muted)]">{formatDate(row.created_at)}</AdminTd>
                  <AdminTd className="text-right"><div className="flex items-center justify-end gap-2">{canManage ? admin.deleted ? <RestoreButton onRestore={() => admin.mutate({ action: "restore", id: row.id })} /> : <><Button type="button" variant="secondary" className="!px-3 !py-1.5 !text-[13px]" onClick={() => startEdit(row)}><Pencil className="h-3.5 w-3.5" /> Edit</Button><TwoStepDelete onConfirm={() => admin.mutate({ action: "delete", id: row.id })} /></> : <span className="font-mono text-xs text-[var(--faint)]">Read only</span>}</div></AdminTd>
                </tr>
              );
            })}
          </tbody>
        </AdminTable>
      )}
      <AdminPagination page={admin.page} pageSize={admin.pageSize} total={admin.total} onPageChange={admin.setPage} onPageSizeChange={admin.setPageSize} />
      </>}
    </div>
  );
}

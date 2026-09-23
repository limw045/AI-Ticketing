"use client";

import { useState } from "react";
import { Check, KeyRound, Pencil, Plus, X } from "lucide-react";
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

export default function AdminApiClientsPage() {
  const admin = useAdminResource("api-clients");
  const [clientName, setClientName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const createClient = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setGeneratedKey("");
    const result = await admin.mutate({ action: "create", data: { name: clientName } });
    setSubmitting(false);
    if (result.ok) {
      setClientName("");
      setGeneratedKey(String(result.data?.api_key ?? ""));
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const result = await admin.mutate({ action: "update", id: editing.id, expectedUpdatedAt: editing.updated_at, data: { name: editName } });
    if (result.ok) setEditing(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Administration" title="API clients" description="Generate one-time keys, rename integrations, revoke access, and restore archived client records." />
      <AdminLoadError message={admin.error} onRetry={admin.refresh} />
      {admin.notice && <Alert tone="success">{admin.notice}</Alert>}

      <section className="surface p-4 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-soft)]"><Plus className="h-3.5 w-3.5 text-[var(--brand-ink)]" /></span>
          <div><h2 className="font-display text-base font-bold">Create client</h2><p className="text-xs text-[var(--muted)]">The generated key is shown once and cannot be recovered.</p></div>
        </div>
        <form onSubmit={createClient} className="flex flex-col gap-3 md:flex-row">
          <label className="flex-1"><FieldLabel>App name</FieldLabel><Input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="App name, e.g. Model Gateway" required /></label>
          <div className="flex items-end"><Button type="submit" disabled={submitting} className="w-full md:w-auto"><KeyRound className="h-4 w-4" /> {submitting ? "Generating…" : "Generate API key"}</Button></div>
        </form>
        {generatedKey && <div className="mt-4 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning)]"><strong className="block">Copy this key now. It cannot be shown again.</strong><code className="mt-2 block select-all break-all font-mono text-xs">{generatedKey}</code></div>}
      </section>

      <AdminResourceToolbar q={admin.q} onQChange={admin.setQ} deleted={admin.deleted} onDeletedChange={admin.setDeleted} dateFrom={admin.dateFrom} dateTo={admin.dateTo} onDateFromChange={admin.setDateFrom} onDateToChange={admin.setDateTo}>
        <Select value={admin.filters.is_active ?? "all"} onChange={(event) => admin.setFilter("is_active", event.target.value)} className="!w-auto !py-2.5 !text-xs" aria-label="Client status"><option value="all">All statuses</option><option value="true">Active</option><option value="false">Revoked</option></Select>
      </AdminResourceToolbar>

      {admin.loading && admin.rows.length === 0 ? <AdminTableSkeleton columns={6} /> : admin.error && admin.rows.length === 0 ? null : admin.rows.length === 0 ? <div className="surface py-16 text-center text-sm text-[var(--muted)]">No API clients match this view.</div> : (
        <AdminTable
          header={<><h2 className="font-display text-base font-bold">{admin.deleted ? "Deleted" : "Active"} clients</h2><StatusBadge tone="neutral">{admin.total} total</StatusBadge></>}
          mobile={<AdminMobileList items={admin.rows.map((client) => ({
            id: String(client.id),
            title: client.name,
            subtitle: `Created by ${client.creator?.display_name ?? "Unknown"}`,
            badges: <StatusBadge tone={client.is_active ? "success" : "neutral"}>{client.is_active ? "Active" : "Revoked"}</StatusBadge>,
            fields: [
              { label: "Status", value: client.is_active ? "Active" : "Revoked" },
              { label: "Created by", value: client.creator?.display_name ?? "Unknown" },
              { label: "Last used", value: client.last_used_at ? new Date(client.last_used_at).toLocaleString() : "Never" },
              { label: "Created", value: new Date(client.created_at).toLocaleString() },
            ],
            actions: (close) => admin.deleted ? <RestoreButton onRestore={async () => { await admin.mutate({ action: "restore", id: client.id }); close(); }} /> : <><Button type="button" variant="secondary" onClick={async () => { await admin.mutate({ action: "update", id: client.id, expectedUpdatedAt: client.updated_at, data: { is_active: !client.is_active } }); close(); }}>{client.is_active ? "Revoke client" : "Activate client"}</Button><Button type="button" variant="secondary" onClick={() => { setEditing(client); setEditName(client.name); close(); }}><Pencil className="h-4 w-4" /> Rename</Button><TwoStepDelete onConfirm={async () => { await admin.mutate({ action: "delete", id: client.id }); close(); }} /></>,
          }))} />}
        >
          <AdminThead><AdminTh>Name</AdminTh><AdminTh>Status</AdminTh><AdminTh>Created by</AdminTh><AdminTh>Last used</AdminTh><AdminTh>Created</AdminTh><AdminTh className="text-right">Actions</AdminTh></AdminThead>
          <tbody className="divide-y divide-[var(--line)]">
            {admin.rows.map((client) => (
              <tr key={client.id} className="transition hover:bg-[var(--surface-2)]">
                <AdminTd>{editing?.id === client.id ? <Input value={editName} onChange={(event) => setEditName(event.target.value)} className="min-w-[180px]" /> : <span className="text-sm font-semibold">{client.name}</span>}</AdminTd>
                <AdminTd><button type="button" disabled={admin.deleted} onClick={() => admin.mutate({ action: "update", id: client.id, expectedUpdatedAt: client.updated_at, data: { is_active: !client.is_active } })} className="disabled:cursor-default"><StatusBadge tone={client.is_active ? "success" : "neutral"}>{client.is_active ? "Active" : "Revoked"}</StatusBadge></button></AdminTd>
                <AdminTd className="text-xs text-[var(--muted)]">{client.creator?.display_name ?? "Unknown"}</AdminTd>
                <AdminTd className="font-mono text-xs text-[var(--faint)]">{client.last_used_at ? new Date(client.last_used_at).toLocaleString() : "Never"}</AdminTd>
                <AdminTd className="font-mono text-xs text-[var(--faint)]">{new Date(client.created_at).toLocaleDateString()}</AdminTd>
                <AdminTd className="text-right"><div className="flex items-center justify-end gap-2">{admin.deleted ? <RestoreButton onRestore={() => admin.mutate({ action: "restore", id: client.id })} /> : editing?.id === client.id ? <><Button type="button" className="!px-3 !py-1.5 !text-xs" onClick={saveEdit}><Check className="h-3.5 w-3.5" /> Save</Button><Button type="button" variant="ghost" className="!px-3 !py-1.5 !text-xs" onClick={() => setEditing(null)}><X className="h-3.5 w-3.5" /></Button></> : <><Button type="button" variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => { setEditing(client); setEditName(client.name); }}><Pencil className="h-3.5 w-3.5" /> Rename</Button><TwoStepDelete onConfirm={() => admin.mutate({ action: "delete", id: client.id })} /></>}</div></AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
      <AdminPagination page={admin.page} pageSize={admin.pageSize} total={admin.total} onPageChange={admin.setPage} onPageSizeChange={admin.setPageSize} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { runAdminMutation } from "@/app/(workspace)/admin/actions";
import { useAdminResource } from "@/components/admin/useAdminResource";
import { AdminLoadError, AdminMobileList, AdminPagination, AdminTable, AdminTableSkeleton, AdminTd, AdminTh, AdminThead, AdminToolbar, RestoreButton } from "@/components/admin/table";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";

export function RecycleBinClient() {
  const admin = useAdminResource("recycle-bin");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const restore = async (row: any) => {
    admin.setError("");
    const result = await runAdminMutation({ resource: row.resource, action: "restore", id: row.id });
    if (!result.ok) admin.setError(result.message);
    else { admin.setNotice(result.message ?? "Record restored."); await admin.refresh(); }
  };
  const dateFilters = <><Input type="date" value={admin.dateFrom} onChange={(event) => admin.setDateFrom(event.target.value)} aria-label="Deleted from" className="!w-full !py-2.5 sm:!w-auto" /><Input type="date" value={admin.dateTo} onChange={(event) => admin.setDateTo(event.target.value)} aria-label="Deleted to" className="!w-full !py-2.5 sm:!w-auto" /></>;
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Super Administration" title="Recycle bin" description="A consolidated, recoverable view of deleted business records. Permanent purge is intentionally unavailable." />
      <AdminLoadError message={admin.error} onRetry={admin.refresh} />
      {admin.notice && <Alert tone="success">{admin.notice}</Alert>}
      <AdminToolbar className="items-end">
        <label className="relative min-w-0 flex-1 sm:min-w-[240px]"><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--faint)]" /><Input value={admin.q} onChange={(event) => admin.setQ(event.target.value)} placeholder="Search deleted records..." className="pl-10" /></label>
        <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] px-4 text-sm font-semibold md:hidden"><SlidersHorizontal className="h-4 w-4" /> Date filters</button>
        <div className="hidden items-end gap-3 md:flex">{dateFilters}</div>
      </AdminToolbar>
      <ResponsiveSheet open={filtersOpen} onOpenChange={setFiltersOpen} title="Filter recycle bin" description="Limit deleted records by date." footer={<button type="button" onClick={() => setFiltersOpen(false)} className="min-h-11 w-full rounded-full bg-[var(--brand)] text-sm font-semibold text-[var(--brand-on)]">Apply filters</button>}><div className="space-y-4 [&>input]:!w-full">{dateFilters}</div></ResponsiveSheet>
      {admin.loading && admin.rows.length === 0 ? <AdminTableSkeleton columns={5} /> : admin.error && admin.rows.length === 0 ? null : admin.rows.length === 0 ? <div className="surface py-16 text-center text-sm text-[var(--muted)]">The recycle bin is empty.</div> : (
        <AdminTable header={<><h2 className="font-display text-base font-bold">Deleted records</h2><StatusBadge tone="neutral">{admin.total} total</StatusBadge></>} mobile={<AdminMobileList items={admin.rows.map((row) => ({ id: `${row.resource}-${row.id}`, title: row.label, subtitle: String(row.resource).replace("-", " "), badges: <StatusBadge tone="neutral">{String(row.resource).replace("-", " ")}</StatusBadge>, fields: [{ label: "Resource", value: String(row.resource).replace("-", " ") }, { label: "Record ID", value: row.id }, { label: "Deleted", value: new Date(row.deleted_at).toLocaleString() }], actions: (close) => <RestoreButton onRestore={async () => { await restore(row); close(); }} /> }))} />}>
          <AdminThead><AdminTh>Resource</AdminTh><AdminTh>Record</AdminTh><AdminTh>ID</AdminTh><AdminTh>Deleted</AdminTh><AdminTh className="text-right">Actions</AdminTh></AdminThead>
          <tbody className="divide-y divide-[var(--line)]">{admin.rows.map((row) => <tr key={`${row.resource}-${row.id}`} className="hover:bg-[var(--surface-2)]"><AdminTd><StatusBadge tone="neutral">{String(row.resource).replace("-", " ")}</StatusBadge></AdminTd><AdminTd><span className="block max-w-[360px] truncate text-sm font-semibold">{row.label}</span></AdminTd><AdminTd className="font-mono text-[10px] text-[var(--faint)]">{row.id}</AdminTd><AdminTd className="font-mono text-[11px] text-[var(--faint)]">{new Date(row.deleted_at).toLocaleString()}</AdminTd><AdminTd className="text-right"><RestoreButton onRestore={() => restore(row)} /></AdminTd></tr>)}</tbody>
        </AdminTable>
      )}
      <AdminPagination page={admin.page} pageSize={admin.pageSize} total={admin.total} onPageChange={admin.setPage} onPageSizeChange={admin.setPageSize} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { runAdminMutation } from "@/app/(workspace)/admin/actions";
import { useAdminResource } from "@/components/admin/useAdminResource";
import { AdminLoadError, AdminMobileList, AdminPagination, AdminTable, AdminTableSkeleton, AdminTd, AdminTh, AdminThead, AdminToolbar, RestoreButton } from "@/components/admin/table";
import { DateFilterInput } from "@/components/admin/DateFilterInput";
import { formatDateTime } from "@/lib/date-display";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
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
  const dateFilters = <><DateFilterInput label="Deleted from" value={admin.dateFrom} onChange={admin.setDateFrom} className="w-full md:w-[164px]" /><DateFilterInput label="Deleted to" value={admin.dateTo} onChange={admin.setDateTo} className="w-full md:w-[164px]" /></>;
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
      {admin.loading && admin.rows.length === 0 ? <AdminTableSkeleton columns={5} /> : admin.error && admin.rows.length === 0 ? null : admin.rows.length === 0 ? <ListEmptyState title={admin.q || admin.dateFrom || admin.dateTo ? "No matching deleted records" : "The recycle bin is empty"} description={admin.q || admin.dateFrom || admin.dateTo ? "Try a broader search or clear the filters." : "Deleted business records can be restored here."} actionLabel={admin.q || admin.dateFrom || admin.dateTo ? "Clear filters" : undefined} onAction={admin.q || admin.dateFrom || admin.dateTo ? admin.clearFilters : undefined} /> : (
        <AdminTable header={<><h2 className="font-display text-base font-bold">Deleted records</h2><StatusBadge tone="neutral">{admin.total} total</StatusBadge></>} mobile={<AdminMobileList items={admin.rows.map((row) => ({ id: `${row.resource}-${row.id}`, title: row.label, subtitle: String(row.resource).replace("-", " "), badges: <StatusBadge tone="neutral">{String(row.resource).replace("-", " ")}</StatusBadge>, fields: [{ label: "Resource", value: String(row.resource).replace("-", " ") }, { label: "Record ID", value: row.id }, { label: "Deleted", value: formatDateTime(row.deleted_at) }], actions: (close) => <RestoreButton onRestore={async () => { await restore(row); close(); }} /> }))} />}>
          <AdminThead><AdminTh>Resource</AdminTh><AdminTh>Record</AdminTh><AdminTh>ID</AdminTh><AdminTh>Deleted</AdminTh><AdminTh className="text-right">Actions</AdminTh></AdminThead>
          <tbody className="divide-y divide-[var(--line)]">{admin.rows.map((row) => <tr key={`${row.resource}-${row.id}`} className="hover:bg-[var(--surface-2)]"><AdminTd><StatusBadge tone="neutral">{String(row.resource).replace("-", " ")}</StatusBadge></AdminTd><AdminTd><span className="block max-w-[360px] truncate text-sm font-semibold">{row.label}</span></AdminTd><AdminTd className="font-mono text-xs text-[var(--faint)]">{row.id}</AdminTd><AdminTd className="whitespace-nowrap text-[13px] text-[var(--muted)]">{formatDateTime(row.deleted_at)}</AdminTd><AdminTd className="text-right"><RestoreButton onRestore={() => restore(row)} /></AdminTd></tr>)}</tbody>
        </AdminTable>
      )}
      <AdminPagination page={admin.page} pageSize={admin.pageSize} total={admin.total} onPageChange={admin.setPage} onPageSizeChange={admin.setPageSize} />
    </div>
  );
}

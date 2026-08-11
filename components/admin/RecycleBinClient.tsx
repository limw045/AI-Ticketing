"use client";

import { Search } from "lucide-react";
import { runAdminMutation } from "@/app/(workspace)/admin/actions";
import { useAdminResource } from "@/components/admin/useAdminResource";
import { AdminLoadError, AdminPagination, AdminTable, AdminTableSkeleton, AdminTd, AdminTh, AdminThead, AdminToolbar, RestoreButton } from "@/components/admin/table";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function RecycleBinClient() {
  const admin = useAdminResource("recycle-bin");
  const restore = async (row: any) => {
    admin.setError("");
    const result = await runAdminMutation({ resource: row.resource, action: "restore", id: row.id });
    if (!result.ok) admin.setError(result.message);
    else { admin.setNotice(result.message ?? "Record restored."); await admin.refresh(); }
  };
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Super Administration" title="Recycle bin" description="A consolidated, recoverable view of deleted business records. Permanent purge is intentionally unavailable." />
      <AdminLoadError message={admin.error} onRetry={admin.refresh} />
      {admin.notice && <Alert tone="success">{admin.notice}</Alert>}
      <AdminToolbar className="items-end">
        <label className="relative min-w-[240px] flex-1"><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--faint)]" /><Input value={admin.q} onChange={(event) => admin.setQ(event.target.value)} placeholder="Search deleted records..." className="pl-10" /></label>
        <Input type="date" value={admin.dateFrom} onChange={(event) => admin.setDateFrom(event.target.value)} aria-label="Deleted from" className="!w-auto !py-2.5" />
        <Input type="date" value={admin.dateTo} onChange={(event) => admin.setDateTo(event.target.value)} aria-label="Deleted to" className="!w-auto !py-2.5" />
      </AdminToolbar>
      {admin.loading && admin.rows.length === 0 ? <AdminTableSkeleton columns={5} /> : admin.error && admin.rows.length === 0 ? null : admin.rows.length === 0 ? <div className="surface py-16 text-center text-sm text-[var(--muted)]">The recycle bin is empty.</div> : (
        <AdminTable header={<><h2 className="font-display text-base font-bold">Deleted records</h2><StatusBadge tone="neutral">{admin.total} total</StatusBadge></>}>
          <AdminThead><AdminTh>Resource</AdminTh><AdminTh>Record</AdminTh><AdminTh>ID</AdminTh><AdminTh>Deleted</AdminTh><AdminTh className="text-right">Actions</AdminTh></AdminThead>
          <tbody className="divide-y divide-[var(--line)]">{admin.rows.map((row) => <tr key={`${row.resource}-${row.id}`} className="hover:bg-[var(--surface-2)]"><AdminTd><StatusBadge tone="neutral">{String(row.resource).replace("-", " ")}</StatusBadge></AdminTd><AdminTd><span className="block max-w-[360px] truncate text-sm font-semibold">{row.label}</span></AdminTd><AdminTd className="font-mono text-[10px] text-[var(--faint)]">{row.id}</AdminTd><AdminTd className="font-mono text-[11px] text-[var(--faint)]">{new Date(row.deleted_at).toLocaleString()}</AdminTd><AdminTd className="text-right"><RestoreButton onRestore={() => restore(row)} /></AdminTd></tr>)}</tbody>
        </AdminTable>
      )}
      <AdminPagination page={admin.page} pageSize={admin.pageSize} total={admin.total} onPageChange={admin.setPage} onPageSizeChange={admin.setPageSize} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useAdminResource } from "@/components/admin/useAdminResource";
import { AdminLoadError, AdminPagination, AdminTable, AdminTableSkeleton, AdminTd, AdminTh, AdminThead, AdminToolbar } from "@/components/admin/table";
import { Input, Select } from "@/components/ui/FormField";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AdminResource } from "@/lib/admin/types";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";

function readPath(row: any, path: string) {
  return path.split(".").reduce((value, key) => value?.[key], row);
}
export function ReadOnlyLogTable({
  resource,
  columns,
  filters = [],
}: {
  resource: AdminResource;
  columns: { key: string; label: string; date?: boolean; json?: boolean }[];
  filters?: { key: string; label: string; options: { label: string; value: string }[] }[];
}) {
  const admin = useAdminResource(resource);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterControls = (
    <>
      {filters.map((filter) => <Select key={filter.key} value={admin.filters[filter.key] ?? "all"} onChange={(event) => admin.setFilter(filter.key, event.target.value)} className="!w-auto !py-2.5 !text-xs" aria-label={filter.label}><option value="all">All {filter.label.toLowerCase()}</option>{filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>)}
      <Input type="date" value={admin.dateFrom} onChange={(event) => admin.setDateFrom(event.target.value)} aria-label="From date" className="!w-full !py-2.5 sm:!w-auto" />
      <Input type="date" value={admin.dateTo} onChange={(event) => admin.setDateTo(event.target.value)} aria-label="To date" className="!w-full !py-2.5 sm:!w-auto" />
    </>
  );
  return (
    <div className="space-y-5">
      <AdminLoadError message={admin.error} onRetry={admin.refresh} />
      <AdminToolbar className="items-end">
        <label className="relative min-w-0 flex-1 sm:min-w-[240px]"><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--faint)]" /><Input value={admin.q} onChange={(event) => admin.setQ(event.target.value)} placeholder="Search logs..." className="pl-10" /></label>
        <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] px-4 text-sm font-semibold md:hidden"><SlidersHorizontal className="h-4 w-4" /> Filters</button>
        <div className="hidden flex-wrap items-end gap-3 md:flex">{filterControls}</div>
      </AdminToolbar>
      <ResponsiveSheet open={filtersOpen} onOpenChange={setFiltersOpen} title="Filter logs" description="Limit immutable records by type and date." footer={<button type="button" onClick={() => setFiltersOpen(false)} className="min-h-11 w-full rounded-full bg-[var(--brand)] text-sm font-semibold text-[var(--brand-on)]">Apply filters</button>}><div className="space-y-4 [&>input]:!w-full [&>select]:!w-full">{filterControls}</div></ResponsiveSheet>
      {admin.loading && admin.rows.length === 0 ? <AdminTableSkeleton columns={columns.length} /> : admin.error && admin.rows.length === 0 ? null : admin.rows.length === 0 ? <div className="surface py-16 text-center text-sm text-[var(--muted)]">No log records match this view.</div> : (
        <AdminTable header={<><h2 className="font-display text-base font-bold">Immutable records</h2><StatusBadge tone="neutral">{admin.total} total</StatusBadge></>}>
          <AdminThead>{columns.map((column) => <AdminTh key={column.key}>{column.label}</AdminTh>)}</AdminThead>
          <tbody className="divide-y divide-[var(--line)]">{admin.rows.map((row) => <tr key={row.id} className="hover:bg-[var(--surface-2)]">{columns.map((column) => { const value = readPath(row, column.key); return <AdminTd key={column.key} className={column.date ? "whitespace-nowrap font-mono text-[11px] text-[var(--faint)]" : ""}><span className={column.json ? "block max-w-[420px] truncate font-mono text-[10px] text-[var(--muted)]" : "text-xs text-[var(--ink)]"}>{column.date && value ? new Date(value).toLocaleString() : column.json ? JSON.stringify(value ?? {}) : String(value ?? "—")}</span></AdminTd>; })}</tr>)}</tbody>
        </AdminTable>
      )}
      <AdminPagination page={admin.page} pageSize={admin.pageSize} total={admin.total} onPageChange={admin.setPage} onPageSizeChange={admin.setPageSize} />
    </div>
  );
}

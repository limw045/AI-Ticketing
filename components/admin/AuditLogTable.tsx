"use client";

import { useState } from "react";
import { Copy, Search, SlidersHorizontal } from "lucide-react";
import { useAdminResource } from "@/components/admin/useAdminResource";
import { AdminLoadError, AdminPagination, AdminTable, AdminTableSkeleton, AdminTd, AdminTh, AdminThead, AdminToolbar } from "@/components/admin/table";
import { DateFilterInput } from "@/components/admin/DateFilterInput";
import { Input, Select } from "@/components/ui/FormField";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { auditActionLabel, auditTarget, readableField, shortRecordId } from "@/lib/admin/audit-display";
import { formatAuditTime, formatDateTime } from "@/lib/date-display";

interface AuditRow {
  id: string;
  actor?: { display_name?: string | null; email?: string | null } | null;
  action: string;
  entity_type: string;
  entity_id: string;
  changed_fields?: Record<string, unknown> | null;
  created_at: string;
}

const TECHNICAL_FIELDS = new Set(["id", "created_at", "updated_at", "deleted_at"]);

function recordedValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function AuditLogTable() {
  const admin = useAdminResource("activity-logs");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const [copied, setCopied] = useState(false);
  const hasFilters = Boolean(admin.q || admin.dateFrom || admin.dateTo || admin.filters.action && admin.filters.action !== "all");
  const recordedFields = Object.entries(selected?.changed_fields ?? {}).filter(([key]) => !TECHNICAL_FIELDS.has(key));

  const filters = <>
    <Select value={admin.filters.action ?? "all"} onChange={(event) => admin.setFilter("action", event.target.value)} aria-label="Action" className="!w-auto !py-2.5"><option value="all">All actions</option><option value="insert">Created</option><option value="update">Updated</option></Select>
    <DateFilterInput label="From date" value={admin.dateFrom} onChange={admin.setDateFrom} className="w-full md:w-[164px]" />
    <DateFilterInput label="To date" value={admin.dateTo} onChange={admin.setDateTo} className="w-full md:w-[164px]" />
  </>;

  const copyId = async () => {
    if (!selected?.entity_id) return;
    try {
      await navigator.clipboard.writeText(selected.entity_id);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return <div className="space-y-4">
    <AdminLoadError message={admin.error} onRetry={admin.refresh} />
    <AdminToolbar>
      <label className="relative min-w-0 flex-1 sm:min-w-[240px]"><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--faint)]" aria-hidden="true" /><Input value={admin.q} onChange={(event) => admin.setQ(event.target.value)} placeholder="Search activity..." aria-label="Search activity" className="pl-10" /></label>
      <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--line-strong)] px-4 text-sm font-semibold md:hidden"><SlidersHorizontal className="h-4 w-4" /> Filters</button>
      <div className="hidden flex-wrap items-center gap-3 md:flex">{filters}</div>
    </AdminToolbar>
    <ResponsiveSheet open={filtersOpen} onOpenChange={setFiltersOpen} title="Filter activity" description="Limit records by action and date." footer={<button type="button" onClick={() => setFiltersOpen(false)} className="min-h-11 w-full rounded-[var(--radius-sm)] bg-[var(--brand)] text-sm font-semibold text-[var(--brand-on)]">Apply filters</button>}><div className="space-y-4 [&>select]:!w-full">{filters}</div></ResponsiveSheet>
    {admin.loading && admin.rows.length === 0 ? <AdminTableSkeleton columns={5} /> : admin.error && admin.rows.length === 0 ? null : admin.rows.length === 0 ? <ListEmptyState title={hasFilters ? "No matching activity" : "No admin activity yet"} description={hasFilters ? "Try a broader search or reset the active filters." : "Administrative changes will be recorded here."} actionLabel={hasFilters ? "Clear filters" : undefined} onAction={hasFilters ? admin.clearFilters : undefined} /> : <AdminTable header={<h2 className="text-base font-semibold">Administrative activity</h2>}>
      <AdminThead><AdminTh>Actor</AdminTh><AdminTh>Action</AdminTh><AdminTh>Resource</AdminTh><AdminTh>Target</AdminTh><AdminTh>Time</AdminTh></AdminThead>
      <tbody className="divide-y divide-[var(--line)]">{(admin.rows as AuditRow[]).map((row) => <tr key={row.id} onClick={() => { setSelected(row); setCopied(false); }} className="cursor-pointer hover:bg-[var(--surface-2)]">
        <AdminTd><span className="text-sm font-medium">{row.actor?.display_name || row.actor?.email || "Unknown"}</span></AdminTd>
        <AdminTd><span className="text-sm">{auditActionLabel(row.action)}</span></AdminTd>
        <AdminTd><span className="text-sm text-[var(--muted)]">{readableField(row.entity_type)}</span></AdminTd>
        <AdminTd><button type="button" onClick={() => { setSelected(row); setCopied(false); }} className="block max-w-[260px] truncate text-left text-sm font-semibold text-[var(--brand-ink)] hover:underline" aria-label={`Inspect ${readableField(row.entity_type)} ${auditTarget(row)}`}>{auditTarget(row)}</button></AdminTd>
        <AdminTd className="whitespace-nowrap text-[13px] text-[var(--muted)]">{formatDateTime(row.created_at)}</AdminTd>
      </tr>)}</tbody>
    </AdminTable>}
    <AdminPagination page={admin.page} pageSize={admin.pageSize} total={admin.total} onPageChange={admin.setPage} onPageSizeChange={admin.setPageSize} />
    <ResponsiveSheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }} placement="right" title="Event details" description="Immutable administrative activity record.">
      {selected && <div className="space-y-6 text-sm">
        <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-4 gap-y-3">
          <dt className="text-[var(--muted)]">Actor</dt><dd className="font-medium">{selected.actor?.display_name || selected.actor?.email || "Unknown"}</dd>
          <dt className="text-[var(--muted)]">Action</dt><dd>{auditActionLabel(selected.action)} {readableField(selected.entity_type).toLowerCase()}</dd>
          <dt className="text-[var(--muted)]">Target</dt><dd className="break-words font-medium">{auditTarget(selected)}</dd>
          <dt className="text-[var(--muted)]">Record ID</dt><dd className="flex min-w-0 flex-wrap items-center gap-2"><code className="font-mono text-[13px]">{shortRecordId(selected.entity_id || "—")}</code><button type="button" onClick={() => void copyId()} className="inline-flex min-h-8 items-center gap-1 text-[13px] font-semibold text-[var(--brand-ink)]" aria-label="Copy full record ID"><Copy className="h-3.5 w-3.5" />{copied ? "Copied" : "Copy full ID"}</button></dd>
          <dt className="text-[var(--muted)]">Timestamp</dt><dd><span className="block">{formatAuditTime(selected.created_at)}</span><code className="mt-1 block break-all font-mono text-xs text-[var(--muted)]">{selected.created_at}</code></dd>
        </dl>
        <section><h3 className="font-semibold">Recorded values</h3><p className="mt-1 text-[13px] text-[var(--muted)]">This log stores a safe snapshot of the record after the action.</p><dl className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">{recordedFields.length ? recordedFields.map(([key, value]) => <div key={key} className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 py-2.5"><dt className="text-[var(--muted)]">{readableField(key)}</dt><dd className="min-w-0 break-words">{recordedValue(value)}</dd></div>) : <div className="py-3 text-[var(--muted)]">No additional values recorded.</div>}</dl></section>
        <details className="rounded-[var(--radius-sm)] border border-[var(--line)] p-3"><summary className="cursor-pointer font-semibold">View raw JSON</summary><pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-[var(--muted)]">{JSON.stringify(selected.changed_fields ?? {}, null, 2)}</pre></details>
      </div>}
    </ResponsiveSheet>
  </div>;
}

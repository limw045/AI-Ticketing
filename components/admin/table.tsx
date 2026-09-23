"use client";

import { useState } from "react";
import { Trash2, Check, ChevronLeft, ChevronRight, Search, ArchiveRestore } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input, Select } from "@/components/ui/FormField";
import { DateFilterInput } from "@/components/admin/DateFilterInput";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Alert } from "@/components/ui/Alert";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";

export function AdminTable({
  header,
  children,
  mobile,
  className = "",
}: {
  header?: React.ReactNode;
  children: React.ReactNode;
  mobile?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("admin-table surface overflow-hidden", className)}>
      {header && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-6 py-4">
          {header}
        </div>
      )}
      {mobile && <div className="md:hidden">{mobile}</div>}
      <div className={cn("overflow-x-auto", mobile && "hidden md:block")}>
        <table className="min-w-max w-full border-collapse text-left text-sm md:min-w-0">
          {children}
        </table>
      </div>
      {!mobile && (
        <p className="border-t border-[var(--line)] px-4 py-2 text-center font-mono text-xs text-[var(--faint)] md:hidden">
          Swipe horizontally to view all columns
        </p>
      )}
    </section>
  );
}

export function AdminThead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-[var(--line)] bg-[var(--surface-2)]">
        {children}
      </tr>
    </thead>
  );
}

export function AdminTh({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 font-mono text-xs font-bold uppercase tracking-[var(--tracking-eyebrow)] text-[var(--muted)]",
        className
      )}
    >
      {children}
    </th>
  );
}

export function AdminTd({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>
  );
}

export function TwoStepDelete({
  onConfirm,
  label = "Delete",
  className = "",
}: {
  onConfirm: () => unknown | Promise<unknown>;
  label?: string;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  const handleClick = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setConfirming(false);
    await onConfirm();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition",
        confirming
          ? "bg-[var(--danger)] text-white"
          : "bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white",
        className
      )}
    >
      {confirming ? (
        <>
          <Check className="h-3.5 w-3.5" /> Confirm?
        </>
      ) : (
        <>
          <Trash2 className="h-3.5 w-3.5" /> {label}
        </>
      )}
    </button>
  );
}

export function AdminToolbar({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "admin-toolbar surface flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 [&>label]:w-full [&>select]:!w-full sm:[&>label]:w-auto sm:[&>select]:!w-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminResourceToolbar({
  q,
  onQChange,
  deleted,
  onDeletedChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  children,
}: {
  q: string;
  onQChange: (value: string) => void;
  deleted: boolean;
  onDeletedChange: (value: boolean) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  children?: React.ReactNode;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const deletedToggle = (
    <button
      type="button"
      onClick={() => onDeletedChange(!deleted)}
      className={cn(
        "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition sm:w-auto",
        deleted
          ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-ink)]"
          : "border-[var(--line-strong)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]"
      )}
    >
      <ArchiveRestore className="h-3.5 w-3.5" />
      {deleted ? "Showing Deleted" : "Active records"}
    </button>
  );

  return (
    <>
      <AdminToolbar className="items-end">
        <label className="min-w-0 flex-1 sm:min-w-[240px]">
          <span className="sr-only">Search records</span>
          <span className="relative block">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--faint)]" />
            <Input value={q} onChange={(event) => onQChange(event.target.value)} placeholder="Search records..." className="pl-10" />
          </span>
        </label>
        <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--ink)] md:hidden">
          <Search className="h-4 w-4" /> Filters
        </button>
        <div className="hidden flex-wrap items-end gap-3 md:flex">
          {children}
          <DateFilterInput label="Created from" value={dateFrom} onChange={onDateFromChange} className="w-[164px]" />
          <DateFilterInput label="Created to" value={dateTo} onChange={onDateToChange} className="w-[164px]" />
          {deletedToggle}
        </div>
      </AdminToolbar>
      <ResponsiveSheet open={filtersOpen} onOpenChange={setFiltersOpen} title="Filter records" description="Apply filters to this administrative view." footer={<button type="button" onClick={() => setFiltersOpen(false)} className="min-h-11 w-full rounded-full bg-[var(--brand)] px-5 text-sm font-semibold text-[var(--brand-on)]">Apply filters</button>}>
        <div className="space-y-4 [&>select]:!w-full">
          {children}
          <label className="block"><span className="mb-2 block text-sm font-semibold">Created from</span><DateFilterInput label="Created from" value={dateFrom} onChange={onDateFromChange} className="w-full" /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold">Created to</span><DateFilterInput label="Created to" value={dateTo} onChange={onDateToChange} className="w-full" /></label>
          {deletedToggle}
        </div>
      </ResponsiveSheet>
    </>
  );
}

export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: 25 | 50 | 100;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: 25 | 50 | 100) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  if (total === 0) return null;
  return (
    <div className="admin-pagination flex flex-col items-stretch justify-between gap-3 border-t border-[var(--line)] px-1 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <span className="text-[13px] text-[var(--muted)]">
        {first}–{last} of {total}
      </span>
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
        <Select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value) as 25 | 50 | 100)}
          aria-label="Rows per page"
          className="!w-auto !py-2 !text-[13px]"
        >
          <option value={25}>25 rows</option>
          <option value={50}>50 rows</option>
          <option value={100}>100 rows</option>
        </Select>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--ink)] disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[72px] text-center font-mono text-xs text-[var(--muted)]">
          {page} / {pages}
        </span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--ink)] disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function AdminTableSkeleton({ columns = 6 }: { columns?: number }) {
  return <PageSkeleton variant="table" className={columns > 6 ? "skeleton-table--wide" : ""} />;
}

export function AdminLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  if (!message) return null;
  return (
    <Alert tone="error" role="alert">
      <p>{message}</p>
      <button type="button" onClick={onRetry} className="mt-2 font-semibold underline underline-offset-2">
        Retry
      </button>
    </Alert>
  );
}

export function RestoreButton({ onRestore }: { onRestore: () => unknown | Promise<unknown> }) {
  return (
    <button
      type="button"
      onClick={onRestore}
      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-soft)] px-3 py-1.5 text-xs font-bold text-[var(--success)] transition hover:opacity-80"
    >
      <ArchiveRestore className="h-3.5 w-3.5" /> Restore
    </button>
  );
}

export interface AdminMobileField {
  label: string;
  value: React.ReactNode;
}

export interface AdminMobileItem {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badges?: React.ReactNode;
  fields: AdminMobileField[];
  actions?: (close: () => void) => React.ReactNode;
}

export function AdminMobileList({ items }: { items: AdminMobileItem[] }) {
  const [selected, setSelected] = useState<AdminMobileItem | null>(null);

  return (
    <>
      <div className="divide-y divide-[var(--line)]">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item)}
            className="flex min-h-[72px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)]"
            aria-label={`View details for ${typeof item.title === "string" ? item.title : "record"}`}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[var(--ink)]">{item.title}</span>
              {item.subtitle && <span className="mt-1 block truncate text-xs text-[var(--muted)]">{item.subtitle}</span>}
              {item.badges && <span className="mt-2 flex flex-wrap gap-1.5">{item.badges}</span>}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--brand-ink)]" />
          </button>
        ))}
      </div>
      <ResponsiveSheet
        open={Boolean(selected)}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
        title={typeof selected?.title === "string" ? selected.title : "Record details"}
        description={typeof selected?.subtitle === "string" ? selected.subtitle : undefined}
        footer={selected?.actions ? <div className="flex flex-col gap-2 [&>button]:w-full">{selected.actions(() => setSelected(null))}</div> : undefined}
      >
        <dl className="divide-y divide-[var(--line)]">
          {selected?.fields.map((field, index) => (
            <div key={`${field.label}-${index}`} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="font-mono text-xs font-bold uppercase tracking-[var(--tracking-eyebrow)] text-[var(--faint)]">{field.label}</dt>
              <dd className="break-words text-sm text-[var(--ink)] sm:text-right">{field.value}</dd>
            </div>
          ))}
        </dl>
      </ResponsiveSheet>
    </>
  );
}

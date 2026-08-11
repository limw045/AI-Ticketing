"use client";

import { useState } from "react";
import { Trash2, Check, ChevronLeft, ChevronRight, Search, ArchiveRestore } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input, Select } from "@/components/ui/FormField";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Alert } from "@/components/ui/Alert";

export function AdminTable({
  header,
  children,
  className = "",
}: {
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface overflow-hidden", className)}>
      {header && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-6 py-4">
          {header}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          {children}
        </table>
      </div>
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
        "px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]",
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
        "surface flex flex-wrap items-center justify-between gap-4 p-4",
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
  return (
    <AdminToolbar className="items-end">
      <label className="min-w-[240px] flex-1">
        <span className="sr-only">Search records</span>
        <span className="relative block">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--faint)]" />
          <Input
            value={q}
            onChange={(event) => onQChange(event.target.value)}
            placeholder="Search records..."
            className="pl-10"
          />
        </span>
      </label>
      {children}
      <Input
        type="date"
        value={dateFrom}
        onChange={(event) => onDateFromChange(event.target.value)}
        aria-label="Created from"
        className="!w-auto !py-2.5"
      />
      <Input
        type="date"
        value={dateTo}
        onChange={(event) => onDateToChange(event.target.value)}
        aria-label="Created to"
        className="!w-auto !py-2.5"
      />
      <button
        type="button"
        onClick={() => onDeletedChange(!deleted)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition",
          deleted
            ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-ink)]"
            : "border-[var(--line-strong)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]"
        )}
      >
        <ArchiveRestore className="h-3.5 w-3.5" />
        {deleted ? "Showing Deleted" : "Active records"}
      </button>
    </AdminToolbar>
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
  return (
    <div className="surface flex flex-wrap items-center justify-between gap-4 px-4 py-3">
      <span className="font-mono text-[11px] text-[var(--faint)]">
        {first}–{last} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value) as 25 | 50 | 100)}
          aria-label="Rows per page"
          className="!w-auto !py-2 !text-xs"
        >
          <option value={25}>25 rows</option>
          <option value={50}>50 rows</option>
          <option value={100}>100 rows</option>
        </Select>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--ink)] disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[72px] text-center font-mono text-[11px] text-[var(--muted)]">
          {page} / {pages}
        </span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--ink)] disabled:opacity-40"
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

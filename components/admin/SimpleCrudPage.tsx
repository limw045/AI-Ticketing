"use client";

import { useState } from "react";
import { Plus, Pencil, Check, X } from "lucide-react";
import { useAdminResource } from "@/components/admin/useAdminResource";
import {
  AdminPagination,
  AdminResourceToolbar,
  AdminTable,
  AdminTableSkeleton,
  AdminLoadError,
  AdminTd,
  AdminTh,
  AdminThead,
  RestoreButton,
  TwoStepDelete,
} from "@/components/admin/table";
import { Alert } from "@/components/ui/Alert";
import { Button, FieldLabel, Input, Select, Textarea } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AdminResource } from "@/lib/admin/types";

export interface CrudField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select" | "checkbox" | "number";
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: { label: string; value: string }[];
}

export interface CrudColumn {
  key: string;
  label: string;
  format?: "text" | "date" | "boolean" | "status" | "visibility" | "truncate";
}

export interface CrudFilter {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

function readPath(row: any, path: string) {
  return path.split(".").reduce((value, key) => value?.[key], row);
}

function displayValue(value: unknown, format: CrudColumn["format"]) {
  if (format === "date") return value ? new Date(String(value)).toLocaleString() : "—";
  if (format === "boolean") return value ? "Active" : "Inactive";
  if (format === "visibility") return value ? "Internal" : "Public";
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function SimpleCrudPage({
  resource,
  title,
  description,
  columns,
  fields,
  filters = [],
  compact = false,
  isReadOnlyRow,
}: {
  resource: AdminResource;
  title: string;
  description: string;
  columns: CrudColumn[];
  fields: CrudField[];
  filters?: CrudFilter[];
  compact?: boolean;
  isReadOnlyRow?: (row: any) => boolean;
}) {
  const admin = useAdminResource(resource);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const startCreate = () => {
    setEditing(null);
    setForm(Object.fromEntries(fields.map((field) => [field.key, field.defaultValue ?? (field.type === "checkbox" ? false : "")])));
    setShowForm(true);
    admin.setNotice("");
  };

  const startEdit = (row: any) => {
    setEditing(row);
    setForm(Object.fromEntries(fields.map((field) => [field.key, row[field.key] ?? (field.type === "checkbox" ? false : "")])));
    setShowForm(true);
    admin.setNotice("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await admin.mutate({
      action: editing ? "update" : "create",
      id: editing?.id,
      expectedUpdatedAt: editing?.updated_at,
      data: form,
    });
    setSaving(false);
    if (result.ok) {
      setShowForm(false);
      setEditing(null);
    }
  };

  return (
    <div className={compact ? "space-y-6" : "space-y-8"}>
      {!compact && (
        <PageHeader
          eyebrow="Administration"
          title={title}
          description={description}
          actions={
            <Button type="button" onClick={startCreate}>
              <Plus className="h-4 w-4" /> Add {title.replace(/s$/, "")}
            </Button>
          }
        />
      )}
      {compact && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">{title}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
          </div>
          <Button type="button" onClick={startCreate}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      )}

      <AdminLoadError message={admin.error} onRetry={admin.refresh} />
      {admin.notice && <Alert tone="success">{admin.notice}</Alert>}

      {showForm && (
        <form onSubmit={submit} className="surface grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          <div className="flex items-center justify-between md:col-span-2">
            <div>
              <h3 className="font-display text-base font-bold">{editing ? `Edit ${title.replace(/s$/, "")}` : `Add ${title.replace(/s$/, "")}`}</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">Only safe business fields are editable.</p>
            </div>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Close form" className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-2)]">
              <X className="h-4 w-4" />
            </button>
          </div>
          {fields.map((field) => (
            <label key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
              <FieldLabel>{field.label}</FieldLabel>
              {field.type === "textarea" ? (
                <Textarea
                  rows={5}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={String(form[field.key] ?? "")}
                  onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                />
              ) : field.type === "select" ? (
                <Select
                  required={field.required}
                  value={String(form[field.key] ?? "")}
                  onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value || null }))}
                >
                  {!field.required && <option value="">None</option>}
                  {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              ) : field.type === "checkbox" ? (
                <span className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4">
                  <input
                    type="checkbox"
                    checked={Boolean(form[field.key])}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.checked }))}
                    className="h-4 w-4 rounded border-[var(--line-strong)]"
                  />
                  <span className="text-sm text-[var(--muted)]">Enabled</span>
                </span>
              ) : (
                <Input
                  type={field.type === "number" ? "number" : "text"}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={String(form[field.key] ?? "")}
                  onChange={(event) => setForm((current) => ({ ...current, [field.key]: field.type === "number" ? Number(event.target.value) : event.target.value }))}
                />
              )}
            </label>
          ))}
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      )}

      <AdminResourceToolbar
        q={admin.q}
        onQChange={admin.setQ}
        deleted={admin.deleted}
        onDeletedChange={admin.setDeleted}
        dateFrom={admin.dateFrom}
        dateTo={admin.dateTo}
        onDateFromChange={admin.setDateFrom}
        onDateToChange={admin.setDateTo}
      >
        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={admin.filters[filter.key] ?? "all"}
            onChange={(event) => admin.setFilter(filter.key, event.target.value)}
            aria-label={filter.label}
            className="!w-auto !py-2.5 !text-xs"
          >
            <option value="all">All {filter.label.toLowerCase()}</option>
            {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        ))}
      </AdminResourceToolbar>

      {admin.loading && admin.rows.length === 0 ? (
        <AdminTableSkeleton columns={columns.length + 1} />
      ) : admin.error && admin.rows.length === 0 ? null : admin.rows.length === 0 ? (
        <div className="surface py-16 text-center text-sm text-[var(--muted)]">No records match this view.</div>
      ) : (
        <AdminTable header={<><h2 className="font-display text-base font-bold">{admin.deleted ? "Deleted" : "Active"} {title.toLowerCase()}</h2><StatusBadge tone="neutral">{admin.total} total</StatusBadge></>}>
          <AdminThead>
            {columns.map((column) => <AdminTh key={column.key}>{column.label}</AdminTh>)}
            <AdminTh className="text-right">Actions</AdminTh>
          </AdminThead>
          <tbody className="divide-y divide-[var(--line)]">
            {admin.rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-[var(--surface-2)]">
                {columns.map((column) => {
                  const value = readPath(row, column.key);
                  return (
                    <AdminTd key={column.key} className={column.format === "date" ? "whitespace-nowrap font-mono text-[11px] text-[var(--faint)]" : ""}>
                      {column.format === "status" || column.format === "visibility" ? (
                        <StatusBadge tone={value ? "success" : "neutral"}>{displayValue(value, column.format)}</StatusBadge>
                      ) : (
                        <span className={column.format === "truncate" ? "block max-w-[320px] truncate text-xs text-[var(--muted)]" : "text-sm text-[var(--ink)]"}>
                          {displayValue(value, column.format)}
                        </span>
                      )}
                    </AdminTd>
                  );
                })}
                <AdminTd className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isReadOnlyRow?.(row) ? (
                      <span className="font-mono text-[10px] text-[var(--faint)]">System managed</span>
                    ) : admin.deleted ? (
                      <RestoreButton onRestore={() => admin.mutate({ action: "restore", id: row.id })} />
                    ) : (
                      <>
                        <Button type="button" variant="secondary" className="!px-3 !py-1.5 !text-xs" onClick={() => startEdit(row)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <TwoStepDelete onConfirm={() => admin.mutate({ action: "delete", id: row.id })} />
                      </>
                    )}
                  </div>
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}

      <AdminPagination
        page={admin.page}
        pageSize={admin.pageSize}
        total={admin.total}
        onPageChange={admin.setPage}
        onPageSizeChange={admin.setPageSize}
      />
    </div>
  );
}

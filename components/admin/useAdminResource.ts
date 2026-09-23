"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runAdminMutation } from "@/app/(workspace)/admin/actions";
import type {
  AdminMutationInput,
  AdminResource,
  PaginatedResult,
  WorkspaceRole,
} from "@/lib/admin/types";

export function useAdminResource(resource: AdminResource) {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [viewerRole, setViewerRole] = useState<WorkspaceRole>("employee");
  const [viewerId, setViewerId] = useState("");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const mounted = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQ(params.get("q") ?? "");
    setDateFrom(params.get("dateFrom") ?? "");
    setDateTo(params.get("dateTo") ?? "");
    setDeleted(params.get("deleted") === "true");
    setPage(Math.max(1, Number(params.get("page") || 1)));
    const size = Number(params.get("pageSize") || 25);
    setPageSize(size === 50 || size === 100 ? size : 25);
    const nextFilters: Record<string, string> = {};
    params.forEach((value, key) => {
      if (key.startsWith("filter.")) nextFilters[key.slice(7)] = value;
    });
    setFilters(nextFilters);
    mounted.current = true;
  }, []);

  const load = useCallback(async () => {
    if (!mounted.current) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (deleted) params.set("deleted", "true");
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") params.set(`filter.${key}`, value);
    });
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
    try {
      const response = await fetch(`/api/admin/${resource}?${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load records.");
      const result = payload as PaginatedResult<any>;
      if (result.rows.length === 0 && result.total > 0 && page > 1) {
        setPage(Math.max(1, Math.ceil(result.total / pageSize)));
        return;
      }
      setRows(result.rows);
      setTotal(result.total);
      setViewerRole(result.viewerRole);
      setViewerId(result.viewerId ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load records.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, deleted, filters, page, pageSize, q, resource]);

  useEffect(() => {
    const timer = window.setTimeout(load, q ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, q]);

  const setFilter = (key: string, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const mutate = async (input: Omit<AdminMutationInput, "resource">) => {
    setError("");
    setNotice("");
    const result = await runAdminMutation({ ...input, resource });
    if (!result.ok) {
      setError(result.message);
      return result;
    }
    setNotice(result.message ?? "Saved.");
    await load();
    return result;
  };

  return {
    rows,
    total,
    viewerRole,
    viewerId,
    q,
    setQ: (value: string) => { setQ(value); setPage(1); },
    filters,
    setFilter,
    clearFilters: () => { setQ(""); setFilters({}); setDateFrom(""); setDateTo(""); setDeleted(false); setPage(1); },
    dateFrom,
    setDateFrom: (value: string) => { setDateFrom(value); setPage(1); },
    dateTo,
    setDateTo: (value: string) => { setDateTo(value); setPage(1); },
    deleted,
    setDeleted: (value: boolean) => { setDeleted(value); setPage(1); },
    page,
    setPage,
    pageSize,
    setPageSize: (value: 25 | 50 | 100) => { setPageSize(value); setPage(1); },
    loading,
    error,
    notice,
    setError,
    setNotice,
    refresh: load,
    mutate,
  };
}

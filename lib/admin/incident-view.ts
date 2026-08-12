export type IncidentStatus = "active" | "resolved";
export type IncidentPageSize = 25 | 50 | 100;

export function incidentStatusToBoolean(status: IncidentStatus) {
  return status === "active";
}

export function booleanToIncidentStatus(isActive: boolean): IncidentStatus {
  return isActive ? "active" : "resolved";
}

export function readIncidentPageSize(value: string | null): IncidentPageSize {
  const size = Number(value);
  return size === 50 || size === 100 ? size : 25;
}

export function clampIncidentPage(page: number, total: number, pageSize: IncidentPageSize) {
  return Math.min(Math.max(1, page), Math.max(1, Math.ceil(total / pageSize)));
}

export function buildIncidentListParams({
  q,
  severity,
  dateFrom,
  dateTo,
  deleted,
  status,
  page,
  pageSize,
}: {
  q: string;
  severity: string;
  dateFrom: string;
  dateTo: string;
  deleted: boolean;
  status?: IncidentStatus;
  page: number;
  pageSize: IncidentPageSize;
}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (q) params.set("q", q);
  if (severity && severity !== "all") params.set("filter.severity", severity);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  if (deleted) params.set("deleted", "true");
  if (status && !deleted) {
    params.set("filter.is_active", String(incidentStatusToBoolean(status)));
  }
  return params;
}

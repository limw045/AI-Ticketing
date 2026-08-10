export type WorkspaceRole = "employee" | "admin" | "super_admin";

export type AdminResource =
  | "tickets"
  | "comments"
  | "faqs"
  | "category-rules"
  | "incidents"
  | "api-clients"
  | "staff"
  | "activity-logs"
  | "api-request-logs"
  | "notifications"
  | "recycle-bin";

export type AdminAction = "create" | "update" | "delete" | "restore";

export interface AdminListQuery {
  q?: string;
  page?: number;
  pageSize?: 25 | 50 | 100;
  sort?: string;
  direction?: "asc" | "desc";
  deleted?: boolean;
  dateFrom?: string;
  dateTo?: string;
  filters?: Record<string, string>;
}

export interface PaginatedResult<T = Record<string, unknown>> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  viewerRole: WorkspaceRole;
  viewerId?: string;
}

export type AdminActionResult =
  | { ok: true; data?: Record<string, unknown>; message?: string }
  | {
      ok: false;
      code: "VALIDATION" | "FORBIDDEN" | "CONFLICT" | "NOT_FOUND" | "DATABASE";
      message: string;
      fieldErrors?: Record<string, string>;
    };

export interface AdminMutationInput {
  resource: AdminResource;
  action: AdminAction;
  id?: string;
  expectedUpdatedAt?: string;
  data?: Record<string, unknown>;
}

export const ADMIN_ROLES: WorkspaceRole[] = ["admin", "super_admin"];

export function isAdminRole(role: string | null | undefined): role is "admin" | "super_admin" {
  return role === "admin" || role === "super_admin";
}

export function canManageProfile(
  actorRole: WorkspaceRole,
  targetRole: WorkspaceRole,
  isSelf = false
) {
  if (isSelf || actorRole === "employee") return false;
  if (actorRole === "super_admin") return true;
  return targetRole === "employee";
}

export function canManageRole(actorRole: WorkspaceRole, isSelf = false) {
  return actorRole === "super_admin" && !isSelf;
}

export function sanitizeAdminSearch(value: string) {
  return value.trim().slice(0, 120).replace(/[,%()]/g, " ");
}

export function normalizeAdminListQuery(query: AdminListQuery) {
  const page = Math.max(1, Number(query.page) || 1);
  const candidateSize = Number(query.pageSize);
  const pageSize: 25 | 50 | 100 = candidateSize === 50 || candidateSize === 100 ? candidateSize : 25;
  const direction: "asc" | "desc" = query.direction === "asc" ? "asc" : "desc";
  return { ...query, page, pageSize, direction };
}

import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isAdminRole,
  normalizeAdminListQuery,
  sanitizeAdminSearch,
  type AdminActionResult,
  type AdminListQuery,
  type AdminMutationInput,
  type AdminResource,
  type PaginatedResult,
  type WorkspaceRole,
} from "@/lib/admin/types";

class AdminAccessError extends Error {
  constructor(
    message: string,
    public status: 401 | 403 = 403
  ) {
    super(message);
  }
}

const TABLES: Partial<Record<AdminResource, string>> = {
  tickets: "tickets",
  comments: "comments",
  faqs: "faqs",
  "category-rules": "category_rules",
  incidents: "incidents",
  "api-clients": "api_clients",
  staff: "profiles",
  "activity-logs": "admin_activity_logs",
  "api-request-logs": "api_request_logs",
  notifications: "notifications",
};

const SELECTS: Partial<Record<AdminResource, string>> = {
  tickets:
    "id, ticket_number, title, description, status, priority, category, author_id, assignee_id, source, reporter_email, subtasks, is_pinned, pin_order, created_at, updated_at, deleted_at, author:profiles!tickets_author_id_fkey(id, display_name, department), assignee:profiles!tickets_assignee_id_fkey(id, display_name, department)",
  comments:
    "id, ticket_id, author_id, content, is_internal_note, type, created_at, updated_at, deleted_at, ticket:tickets(id, ticket_number, title), author:profiles(id, display_name, department)",
  faqs: "id, question, answer, category, is_pinned, created_by, created_at, updated_at, deleted_at",
  "category-rules":
    "id, category_name, template_markdown, default_assignee_id, created_at, updated_at, deleted_at, default_assignee:profiles(id, display_name)",
  incidents: "id, title, message, severity, is_active, created_at, updated_at, deleted_at",
  "api-clients":
    "id, name, is_active, created_by, created_at, updated_at, last_used_at, deleted_at, creator:profiles!api_clients_created_by_fkey(id, display_name)",
  staff:
    "id, display_name, email, department, user_type, supervisor_name, role, account_status, created_at, updated_at, deleted_at",
  "activity-logs":
    "id, actor_id, action, entity_type, entity_id, changed_fields, created_at, actor:profiles(id, display_name, email)",
  "api-request-logs":
    "id, client_id, ticket_id, idempotency_key, created_at, client:api_clients(id, name), ticket:tickets(id, ticket_number, title)",
  notifications:
    "id, recipient_id, ticket_id, kind, title, body, read_at, created_at, recipient:profiles(id, display_name, email), ticket:tickets(id, ticket_number, title)",
};

const SORT_FIELDS: Partial<Record<AdminResource, string[]>> = {
  tickets: ["created_at", "updated_at", "ticket_number", "priority", "status"],
  comments: ["created_at", "updated_at"],
  faqs: ["created_at", "updated_at", "category", "question"],
  "category-rules": ["created_at", "updated_at", "category_name"],
  incidents: ["created_at", "updated_at", "severity", "is_active"],
  "api-clients": ["created_at", "updated_at", "last_used_at", "name", "is_active"],
  staff: ["created_at", "updated_at", "display_name", "department", "role", "account_status"],
  "activity-logs": ["created_at", "action", "entity_type"],
  "api-request-logs": ["created_at"],
  notifications: ["created_at", "kind", "read_at"],
};

const SEARCH_FIELDS: Partial<Record<AdminResource, string[]>> = {
  tickets: ["title", "description", "category", "reporter_email"],
  comments: ["content"],
  faqs: ["question", "answer", "category"],
  "category-rules": ["category_name", "template_markdown"],
  incidents: ["title", "message"],
  "api-clients": ["name"],
  staff: ["display_name", "email", "department", "supervisor_name"],
  "activity-logs": ["action", "entity_type", "entity_id"],
  "api-request-logs": ["idempotency_key"],
  notifications: ["title", "body", "kind"],
};

const WRITABLE_FIELDS: Partial<Record<AdminResource, string[]>> = {
  tickets: ["title", "description", "status", "priority", "category", "assignee_id", "subtasks", "is_pinned", "pin_order"],
  comments: ["ticket_id", "content", "is_internal_note"],
  faqs: ["question", "answer", "category", "is_pinned"],
  "category-rules": ["category_name", "template_markdown", "default_assignee_id"],
  incidents: ["title", "message", "severity", "is_active"],
  "api-clients": ["name", "is_active"],
  staff: ["display_name", "department", "user_type", "supervisor_name", "role", "account_status"],
};

async function requireAdmin(superOnly = false) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new AdminAccessError("Authentication required", 401);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, account_status, deleted_at")
    .eq("id", user.id)
    .single();
  if (
    profileError || !profile || profile.account_status !== "active" || profile.deleted_at ||
    !isAdminRole(profile.role)
  ) {
    throw new AdminAccessError("Administrator access required");
  }
  if (superOnly && profile.role !== "super_admin") {
    throw new AdminAccessError("Super Admin access required");
  }
  return { supabase, user, role: profile.role as WorkspaceRole };
}

function applyResourceFilters(query: any, resource: AdminResource, filters: Record<string, string> = {}) {
  const allowed: Partial<Record<AdminResource, string[]>> = {
    tickets: ["status", "priority", "category", "source", "assignee_id"],
    comments: ["ticket_id", "author_id", "is_internal_note"],
    faqs: ["category", "is_pinned"],
    "category-rules": ["default_assignee_id"],
    incidents: ["severity", "is_active"],
    "api-clients": ["is_active", "created_by"],
    staff: ["role", "account_status", "user_type", "department"],
    "activity-logs": ["action", "entity_type", "actor_id"],
    "api-request-logs": ["client_id", "ticket_id"],
    notifications: ["kind", "recipient_id", "ticket_id"],
  };
  if (resource === "staff" && filters.role_group === "administrators") {
    query = query.in("role", ["admin", "super_admin"]);
  }
  for (const key of allowed[resource] ?? []) {
    const value = filters[key];
    if (!value || value === "all") continue;
    if (value === "true" || value === "false") query = query.eq(key, value === "true");
    else query = query.eq(key, value);
  }
  return query;
}

export async function listAdminResource(
  resource: AdminResource,
  rawQuery: AdminListQuery
): Promise<PaginatedResult> {
  const superOnly = ["activity-logs", "api-request-logs", "notifications", "recycle-bin"].includes(resource);
  const { supabase, user, role } = await requireAdmin(superOnly);
  const query = normalizeAdminListQuery(rawQuery);

  if (resource === "recycle-bin") {
    const resources: AdminResource[] = ["tickets", "comments", "faqs", "category-rules", "incidents", "api-clients", "staff"];
    const batches = await Promise.all(resources.map(async (item) => {
      const table = TABLES[item]!;
      const labelField = item === "tickets" ? "title" : item === "comments" ? "content" : item === "faqs" ? "question" : item === "category-rules" ? "category_name" : item === "incidents" ? "title" : item === "api-clients" ? "name" : "display_name";
      const { data, error } = await supabase
        .from(table)
        .select(`id, ${labelField}, deleted_at`)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        resource: item,
        label: row[labelField],
        deleted_at: row.deleted_at,
      }));
    }));
    let allRows = batches.flat().sort((a, b) => String(b.deleted_at).localeCompare(String(a.deleted_at)));
    const search = sanitizeAdminSearch(query.q ?? "").toLowerCase();
    if (search) allRows = allRows.filter((row) => `${row.resource} ${row.label}`.toLowerCase().includes(search));
    if (query.dateFrom) allRows = allRows.filter((row) => String(row.deleted_at) >= query.dateFrom!);
    if (query.dateTo) allRows = allRows.filter((row) => String(row.deleted_at) <= `${query.dateTo}T23:59:59.999Z`);
    const start = (query.page - 1) * query.pageSize;
    return { rows: allRows.slice(start, start + query.pageSize), total: allRows.length, page: query.page, pageSize: query.pageSize, viewerRole: role, viewerId: user.id };
  }

  const table = TABLES[resource];
  const select = SELECTS[resource];
  if (!table || !select) throw new AdminAccessError("Unsupported administrative resource");
  let databaseQuery: any = supabase.from(table).select(select, { count: "exact" });

  if (["tickets", "comments", "faqs", "category-rules", "incidents", "api-clients", "staff"].includes(resource)) {
    databaseQuery = query.deleted
      ? databaseQuery.not("deleted_at", "is", null)
      : databaseQuery.is("deleted_at", null);
  }

  const search = sanitizeAdminSearch(query.q ?? "");
  if (search && SEARCH_FIELDS[resource]?.length) {
    databaseQuery = databaseQuery.or(
      SEARCH_FIELDS[resource]!.map((field) => `${field}.ilike.%${search}%`).join(",")
    );
  }
  if (query.dateFrom) databaseQuery = databaseQuery.gte("created_at", query.dateFrom);
  if (query.dateTo) databaseQuery = databaseQuery.lte("created_at", `${query.dateTo}T23:59:59.999Z`);
  databaseQuery = applyResourceFilters(databaseQuery, resource, query.filters);

  const allowedSorts = SORT_FIELDS[resource] ?? ["created_at"];
  const sort = allowedSorts.includes(query.sort ?? "") ? query.sort! : "created_at";
  const start = (query.page - 1) * query.pageSize;
  databaseQuery = databaseQuery
    .order(sort, { ascending: query.direction === "asc" })
    .range(start, start + query.pageSize - 1);

  const { data, error, count } = await databaseQuery;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0, page: query.page, pageSize: query.pageSize, viewerRole: role, viewerId: user.id };
}

export async function requireAdminPage(superOnly = false) {
  try {
    return await requireAdmin(superOnly);
  } catch {
    redirect("/dashboard?error=forbidden");
  }
}

function pickWritable(resource: AdminResource, input: Record<string, unknown>) {
  const allowed = WRITABLE_FIELDS[resource] ?? [];
  return Object.fromEntries(allowed.filter((key) => key in input).map((key) => [key, input[key]]));
}

function validateMutation(resource: AdminResource, data: Record<string, unknown>) {
  const required: Partial<Record<AdminResource, string[]>> = {
    tickets: ["title", "description", "category"],
    comments: ["ticket_id", "content"],
    faqs: ["question", "answer", "category"],
    "category-rules": ["category_name"],
    incidents: ["title", "message", "severity"],
    "api-clients": ["name"],
  };
  const errors: Record<string, string> = {};
  for (const key of required[resource] ?? []) {
    if (typeof data[key] !== "string" || !(data[key] as string).trim()) errors[key] = "This field is required.";
  }
  return errors;
}

export async function mutateAdminResource(input: AdminMutationInput): Promise<AdminActionResult> {
  try {
    const { supabase, user, role } = await requireAdmin(false);
    const { resource, action, id, expectedUpdatedAt } = input;
    const data = pickWritable(resource, input.data ?? {});

    if (["activity-logs", "api-request-logs", "notifications", "recycle-bin"].includes(resource)) {
      return { ok: false, code: "FORBIDDEN", message: "System records are read-only." };
    }
    if ((action === "update" || action === "delete" || action === "restore") && !id) {
      return { ok: false, code: "VALIDATION", message: "A record id is required." };
    }

    if (resource === "staff") {
      if (action === "create") return { ok: false, code: "VALIDATION", message: "Staff accounts are added through self-registration." };
      const { data: target, error: targetError } = await supabase
        .from("profiles")
        .select("id, role, account_status, deleted_at")
        .eq("id", id!)
        .single();
      if (targetError || !target) return { ok: false, code: "NOT_FOUND", message: "Staff account not found." };
      if (target.id === user.id) return { ok: false, code: "FORBIDDEN", message: "You cannot manage your own account lifecycle or role." };
      if (role === "admin" && target.role !== "employee") {
        return { ok: false, code: "FORBIDDEN", message: "Administrators may only manage Employee accounts." };
      }
      if (action === "delete") {
        const { data: changed, error } = await supabase.from("profiles").update({ account_status: "suspended", deleted_at: new Date().toISOString(), deleted_by: user.id }).eq("id", id!).select("id");
        if (error) throw error;
        if (!changed?.length) return { ok: false, code: "NOT_FOUND", message: "Staff account could not be deleted." };
        return { ok: true, message: "Staff account moved to Deleted and suspended." };
      }
      if (action === "restore") {
        const { data: changed, error } = await supabase.from("profiles").update({ account_status: "suspended", deleted_at: null, deleted_by: null }).eq("id", id!).select("id");
        if (error) throw error;
        if (!changed?.length) return { ok: false, code: "NOT_FOUND", message: "Staff account could not be restored." };
        return { ok: true, message: "Staff account restored in suspended state." };
      }
      if (data.role && data.role !== target.role && role !== "super_admin") {
        return { ok: false, code: "FORBIDDEN", message: "Only Super Admins can change roles." };
      }
    }

    if (action === "create") {
      const fieldErrors = validateMutation(resource, data);
      if (Object.keys(fieldErrors).length) return { ok: false, code: "VALIDATION", message: "Check the required fields.", fieldErrors };
      if (resource === "api-clients") {
        const { data: created, error } = await supabase.rpc("create_api_client", { client_name: String(data.name).trim() });
        if (error) throw error;
        return { ok: true, data: created, message: "API client created." };
      }
      if (resource === "tickets") Object.assign(data, { author_id: user.id, source: "portal" });
      if (resource === "comments") Object.assign(data, { author_id: user.id, type: "user_comment" });
      if (resource === "faqs") Object.assign(data, { created_by: user.id });
      const table = TABLES[resource];
      if (!table) return { ok: false, code: "VALIDATION", message: "Unsupported resource." };
      const { data: created, error } = await supabase.from(table).insert(data).select("id").single();
      if (error) throw error;
      return { ok: true, data: created, message: "Record added." };
    }

    if (action === "delete" || action === "restore") {
      const rpcResource = TABLES[resource];
      if (!rpcResource) return { ok: false, code: "VALIDATION", message: "Unsupported resource." };
      const { error } = await supabase.rpc("set_admin_record_deleted", {
        p_resource: rpcResource,
        p_record_id: id!,
        p_restore: action === "restore",
      });
      if (error) throw error;
      return { ok: true, message: action === "restore" ? "Record restored." : "Record moved to Deleted." };
    }

    if (resource === "comments") {
      const { data: existing } = await supabase.from("comments").select("type").eq("id", id!).single();
      if (existing?.type === "system_audit") return { ok: false, code: "FORBIDDEN", message: "System comments are immutable." };
    }
    const table = TABLES[resource];
    if (!table) return { ok: false, code: "VALIDATION", message: "Unsupported resource." };
    let updateQuery: any = supabase.from(table).update(data).eq("id", id!);
    if (expectedUpdatedAt) updateQuery = updateQuery.eq("updated_at", expectedUpdatedAt);
    const { data: updated, error } = await updateQuery.select("id");
    if (error) throw error;
    if (!updated?.length) return { ok: false, code: "CONFLICT", message: "This record changed after you opened it. Reload and try again." };
    return { ok: true, data: updated[0], message: "Changes saved." };
  } catch (error) {
    if (error instanceof AdminAccessError) return { ok: false, code: "FORBIDDEN", message: error.message };
    const message = error instanceof Error ? error.message : "Database operation failed.";
    const safeMessages = [
      "The final active Super Admin cannot be demoted, suspended, or deleted",
      "You cannot change your own access or account lifecycle",
      "Administrators may only manage Employee accounts",
      "Administrators may not modify other administrators",
      "System comments are immutable",
      "Record not found or already in the requested lifecycle state",
    ];
    const publicMessage = safeMessages.find((candidate) => message.includes(candidate)) ?? "The database rejected this operation. Check the values and your permissions, then try again.";
    return { ok: false, code: message.toLowerCase().includes("not found") ? "NOT_FOUND" : "DATABASE", message: publicMessage };
  }
}

export function isAdminAccessError(error: unknown): error is AdminAccessError {
  return error instanceof AdminAccessError;
}

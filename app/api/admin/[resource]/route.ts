import { NextResponse } from "next/server";
import { isAdminAccessError, listAdminResource } from "@/lib/admin/server";
import type { AdminListQuery, AdminResource } from "@/lib/admin/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  const { resource } = await params;
  const url = new URL(request.url);
  const filters: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (key.startsWith("filter.")) filters[key.slice(7)] = value;
  });
  const query: AdminListQuery = {
    q: url.searchParams.get("q") ?? "",
    page: Number(url.searchParams.get("page") || 1),
    pageSize: Number(url.searchParams.get("pageSize") || 25) as 25 | 50 | 100,
    sort: url.searchParams.get("sort") ?? "created_at",
    direction: url.searchParams.get("direction") === "asc" ? "asc" : "desc",
    deleted: url.searchParams.get("deleted") === "true",
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    filters,
  };

  try {
    return NextResponse.json(await listAdminResource(resource as AdminResource, query));
  } catch (error) {
    const status = isAdminAccessError(error) ? error.status : 500;
    const message = isAdminAccessError(error) && error instanceof Error
      ? error.message
      : "Could not load administrative data.";
    return NextResponse.json({ error: message }, { status });
  }
}

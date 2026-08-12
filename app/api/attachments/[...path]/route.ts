import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { PORTAL_MODE_COOKIE } from "@/lib/portal-mode";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  let decodedSegments: string[];
  try {
    decodedSegments = segments.map(decodeURIComponent);
  } catch {
    return NextResponse.json({ error: "Invalid attachment path" }, { status: 400 });
  }
  const storagePath = decodedSegments.join("/");
  const requestUrl = new URL(request.url);
  const shouldDownload = requestUrl.searchParams.get("download") === "1";
  const requestedName = requestUrl.searchParams.get("name") ?? "attachment";
  const downloadName = requestedName
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._ -]/g, "-")
    .trim()
    .slice(0, 100) || "attachment";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (
    !storagePath ||
    decodedSegments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return NextResponse.json({ error: "Invalid attachment path" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("department_id, role, account_status, deleted_at")
    .eq("id", user.id)
    .single();
  if (!profile || profile.account_status !== "active" || profile.deleted_at) {
    return NextResponse.json({ error: "Attachment access denied" }, { status: 403 });
  }
  const portalMode = (await cookies()).get(PORTAL_MODE_COOKIE)?.value === "admin" ? "admin" : "user";
  const hasAdminConsoleAccess = portalMode === "admin" && ["admin", "super_admin"].includes(profile.role);

  const { data: attachment } = await supabase
    .from("ticket_attachments")
    .select("uploader_id, ticket_id")
    .eq("storage_path", storagePath)
    .maybeSingle();

  let allowed = attachment?.ticket_id == null && attachment?.uploader_id === user.id;
  if (!allowed && attachment?.ticket_id) {
    const { data: visibleTicket } = await supabase
      .from("tickets")
      .select("id, author_id, department_id")
      .eq("id", attachment.ticket_id)
      .is("deleted_at", null)
      .maybeSingle();
    allowed = Boolean(visibleTicket && (
      hasAdminConsoleAccess
      || visibleTicket.author_id === user.id
      || visibleTicket.department_id === profile.department_id
    ));
  }
  // Compatibility for attachments created before metadata tracking.
  if (!allowed && !attachment && decodedSegments[0] === user.id) allowed = true;
  if (!allowed && !attachment) allowed = hasAdminConsoleAccess;
  if (!allowed) {
    return NextResponse.json({ error: "Attachment access denied" }, { status: 403 });
  }

  const bucket = supabase.storage.from("ticket-attachments");
  const { data, error } = shouldDownload
    ? await bucket.createSignedUrl(storagePath, 60, { download: downloadName })
    : await bucket.createSignedUrl(storagePath, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}

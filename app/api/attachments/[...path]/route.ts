import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  if (decodedSegments[0] !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Attachment access denied" }, { status: 403 });
    }
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

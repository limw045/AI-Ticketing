import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const storagePath = segments.map(decodeURIComponent).join("/");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (!storagePath || storagePath.includes("..")) {
    return NextResponse.json({ error: "Invalid attachment path" }, { status: 400 });
  }

  if (segments[0] !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Attachment access denied" }, { status: 403 });
    }
  }

  const { data, error } = await supabase.storage
    .from("ticket-attachments")
    .createSignedUrl(storagePath, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}

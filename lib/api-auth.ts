import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireApiUser(options?: { agentOnly?: boolean }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.account_status !== "active") {
    return { error: NextResponse.json({ error: "Account is not active" }, { status: 403 }) };
  }

  if (options?.agentOnly && !["admin", "super_admin"].includes(profile.role)) {
    return { error: NextResponse.json({ error: "Administrator access required" }, { status: 403 }) };
  }

  return { user, profile, supabase };
}

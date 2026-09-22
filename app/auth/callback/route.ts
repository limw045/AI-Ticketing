import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/login?verified=1";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // The installed SDK returns redirectType at runtime, although its public
      // AuthTokenResponse type omits it. Narrow the property before reading it.
      const isRecovery = "redirectType" in data && data.redirectType === "recovery";
      const destination = isRecovery ? "/reset-password" : next;
      if (destination !== "/reset-password") {
        await supabase.auth.signOut({ scope: "local" });
      }
      return NextResponse.redirect(new URL(destination, requestUrl.origin));
    }
  }

  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("error", "Email confirmation failed or expired. Please sign in again.");
  return NextResponse.redirect(loginUrl);
}

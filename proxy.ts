import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createClient as createDataClient } from "@supabase/supabase-js";
import { getSupabaseAuthConfig, getSupabasePublicConfig } from "@/lib/supabase/config";
import { getDataToken } from "@/lib/supabase/data-token";
import { safeInternalNext } from "@/lib/auth-redirect";

const protectedPrefixes = ["/tickets", "/faq", "/admin", "/dashboard", "/onboarding"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { schema } = getSupabasePublicConfig();
  const { url, anonKey } = getSupabaseAuthConfig();
  const supabase = createServerClient(url, anonKey, {
    db: { schema },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const needsAuth = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (needsAuth && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const dataConfig = getSupabasePublicConfig();
    const profileClient = dataConfig.url === url ? supabase : createDataClient(dataConfig.url, dataConfig.anonKey, {
      db: { schema }, accessToken: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session ? (await getDataToken(session.access_token)).token : null;
      },
    });
    const { data: profile, error: profileError } = await profileClient
      .from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (!profileError && !profile) {
      const onboardingUrl = new URL("/onboarding", request.url);
      onboardingUrl.searchParams.set("next", safeInternalNext(request.nextUrl.searchParams.get("next")));
      return NextResponse.redirect(onboardingUrl);
    }
    const ticketsUrl = request.nextUrl.clone();
    const next = safeInternalNext(request.nextUrl.searchParams.get("next"));
    const [nextPath, nextQuery = ""] = next.split("?", 2);
    ticketsUrl.pathname = nextPath;
    ticketsUrl.search = nextQuery ? `?${nextQuery}` : "";
    return NextResponse.redirect(ticketsUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|auth/callback|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

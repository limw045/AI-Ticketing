import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createClient as createDataClient } from "@supabase/supabase-js";
import { getSupabaseAuthConfig, getSupabasePublicConfig } from "@/lib/supabase/config";
import { getDataToken } from "@/lib/supabase/data-token";
import { safeInternalNext } from "@/lib/auth-redirect";
import { decodeJwt } from "jose";
import { ACCESS_COOKIE, REFRESH_COOKIE, portalConfig, tokenRequest, verifyPortalToken } from "@/lib/auth/portal-oauth";
import { setOAuthCookies, clearOAuthCookies } from "@/lib/auth/portal-session";

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

  const portalAccess = request.cookies.get(ACCESS_COOKIE)?.value;
  const portalRefresh = request.cookies.get(REFRESH_COOKIE)?.value;
  let refreshedTokens: Awaited<ReturnType<typeof tokenRequest>> = null;
  let clearPortalCookies = false;
  if (portalRefresh) {
    let expiresAt = 0;
    try { expiresAt = portalAccess ? decodeJwt(portalAccess).exp ?? 0 : 0; } catch { /* Treat as expired. */ }
    if (expiresAt < Date.now() / 1000 + 300) {
      const config = portalConfig(request.nextUrl.origin);
      refreshedTokens = await tokenRequest(config, new URLSearchParams({
        grant_type: "refresh_token", refresh_token: portalRefresh,
      }));
      if (refreshedTokens && await verifyPortalToken(config, refreshedTokens.access_token)) {
        const { error } = await supabase.auth.setSession({ access_token: refreshedTokens.access_token, refresh_token: refreshedTokens.refresh_token });
        if (error) { refreshedTokens = null; clearPortalCookies = true; }
      } else {
        refreshedTokens = null;
        clearPortalCookies = true;
      }
    }
  }

  const { data: { user } } = clearPortalCookies ? { data: { user: null } } : await supabase.auth.getUser();
  if (refreshedTokens) setOAuthCookies(request, response, refreshedTokens);
  if (clearPortalCookies) clearOAuthCookies(response, request);
  const pathname = request.nextUrl.pathname;
  const needsAuth = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (needsAuth && !user) {
    if (request.headers.get("accept")?.includes("application/json")) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const loginUrl = request.nextUrl.clone();
    const oauthReady = process.env.TICKETING_OAUTH_CLIENT_ID && process.env.TICKETING_OAUTH_CLIENT_SECRET && process.env.TICKETING_OAUTH_REDIRECT_URI;
    loginUrl.pathname = oauthReady && !clearPortalCookies ? "/auth/portal/start" : "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(loginUrl);
    if (clearPortalCookies) clearOAuthCookies(redirect, request);
    return redirect;
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
    "/((?!api|auth/callback|auth/portal|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

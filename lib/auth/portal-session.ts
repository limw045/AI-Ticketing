import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAuthConfig, getSupabaseSchema } from "@/lib/supabase/config";
import { ACCESS_COOKIE, REFRESH_COOKIE, type OAuthTokens } from "./portal-oauth";
import { decodeJwt } from "jose";
export const MODE_COOKIE = "ticketing_portal_mode";

export function oauthSessionClient(request: NextRequest, response: NextResponse) {
  const { url, anonKey } = getSupabaseAuthConfig();
  return createServerClient(url, anonKey, {
    db: { schema: getSupabaseSchema() },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        items.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

export function setOAuthCookies(request: NextRequest, response: NextResponse, tokens: OAuthTokens) {
  const common = { httpOnly: true, secure: request.nextUrl.protocol === "https:",
    sameSite: "lax" as const, path: "/" };
  const lifetime = Math.max(0, Math.floor(Math.min(900, tokens.expires_in, (decodeJwt(tokens.access_token).exp ?? 0) - Date.now() / 1000)));
  response.cookies.set(ACCESS_COOKIE, tokens.access_token, { ...common, maxAge: lifetime });
  response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, { ...common, maxAge: 60 * 60 * 24 * 30 });
  response.cookies.set(MODE_COOKIE, "1", { ...common, httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
  request.cookies.set(ACCESS_COOKIE, tokens.access_token);
  request.cookies.set(REFRESH_COOKIE, tokens.refresh_token);
}

export function clearOAuthCookies(response: NextResponse, request?: NextRequest) {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  response.cookies.delete(MODE_COOKIE);
  const key = `sb-${new URL(getSupabaseAuthConfig().url).hostname.split(".")[0]}-auth-token`;
  for (const cookie of request?.cookies.getAll() ?? []) {
    if (cookie.name === key || cookie.name.startsWith(`${key}.`)) response.cookies.delete(cookie.name);
  }
}

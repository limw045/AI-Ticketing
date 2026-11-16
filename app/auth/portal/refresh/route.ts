import { NextResponse, type NextRequest } from "next/server";
import { decodeJwt } from "jose";
import { ACCESS_COOKIE, REFRESH_COOKIE, portalConfig, tokenRequest, verifyPortalToken } from "@/lib/auth/portal-oauth";
import { clearOAuthCookies, oauthSessionClient, setOAuthCookies } from "@/lib/auth/portal-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return new NextResponse(null, { status: 403 });
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return NextResponse.json({ refreshed: false });
  const config = portalConfig(request.nextUrl.origin);
  let fresh = false;
  try {
    fresh = !!access && (decodeJwt(access).exp ?? 0) > Date.now() / 1000 + 600;
  } catch { /* Refresh malformed or expired access tokens. */ }
  if (fresh && await verifyPortalToken(config, access!)) return NextResponse.json({ refreshed: false });
  const tokens = fresh ? null : await tokenRequest(config, new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }));
  if (!tokens || !await verifyPortalToken(config, tokens.access_token)) {
    const response = NextResponse.json({ error: "Portal session expired" }, { status: 401 });
    clearOAuthCookies(response, request);
    return response;
  }
  const response = NextResponse.json({ refreshed: true });
  const auth = oauthSessionClient(request, response);
  const { error } = await auth.auth.setSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
  if (error) {
    const failed = NextResponse.json({ error: "Could not refresh portal session" }, { status: 401 });
    clearOAuthCookies(failed, request);
    return failed;
  }
  setOAuthCookies(request, response, tokens);
  return response;
}

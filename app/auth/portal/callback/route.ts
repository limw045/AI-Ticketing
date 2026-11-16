import { NextResponse, type NextRequest } from "next/server";
import { safeInternalNext } from "@/lib/auth-redirect";
import { FLOW_COOKIE, portalConfig, sameState, tokenRequest, verifyPortalToken, type PortalFlow } from "@/lib/auth/portal-oauth";
import { oauthSessionClient, setOAuthCookies } from "@/lib/auth/portal-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const config = portalConfig(request.nextUrl.origin);
  let flow: PortalFlow | null = null;
  try { flow = JSON.parse(request.cookies.get(FLOW_COOKIE)?.value ?? "null") as PortalFlow | null; }
  catch { /* Expired or malformed flow. */ }
  const fail = (reason: string) => {
    const url = new URL("/login", request.url);
    url.searchParams.set("portalError", reason);
    const response = NextResponse.redirect(url);
    response.cookies.set(FLOW_COOKIE, "", { path: "/auth/portal", maxAge: 0 });
    return response;
  };
  if (!flow || typeof flow.state !== "string" || typeof flow.verifier !== "string"
    || !sameState(flow.state, request.nextUrl.searchParams.get("state"))) return fail("state");
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return fail("denied");
  const tokens = await tokenRequest(config, new URLSearchParams({ grant_type: "authorization_code", code,
    redirect_uri: config.redirectUri, code_verifier: flow.verifier }));
  if (!tokens) return fail("exchange");
  const user = await verifyPortalToken(config, tokens.access_token);
  if (!user) return fail("identity");
  const response = NextResponse.redirect(new URL(safeInternalNext(flow.next), request.url));
  const auth = oauthSessionClient(request, response);
  const { error: sessionError } = await auth.auth.setSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
  if (sessionError) return fail("session");
  response.cookies.set(FLOW_COOKIE, "", { path: "/auth/portal", maxAge: 0 });
  setOAuthCookies(request, response, tokens);
  return response;
}

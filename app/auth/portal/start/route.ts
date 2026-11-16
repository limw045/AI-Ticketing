import { NextResponse, type NextRequest } from "next/server";
import { challenge, FLOW_COOKIE, FLOW_MAX_AGE, newFlow, portalConfig } from "@/lib/auth/portal-oauth";

export const runtime = "nodejs";

export function HEAD() {
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  if (request.headers.has("next-router-prefetch") || request.headers.get("purpose")?.includes("prefetch")
    || request.headers.get("sec-purpose")?.includes("prefetch")) return HEAD();
  const config = portalConfig(request.nextUrl.origin);
  const flow = newFlow(request.nextUrl.searchParams.get("next"));
  const authorize = new URL(`${config.authUrl}/auth/v1/oauth/authorize`);
  authorize.search = new URLSearchParams({
    response_type: "code", client_id: config.clientId, redirect_uri: config.redirectUri,
    state: flow.state, code_challenge: challenge(flow.verifier), code_challenge_method: "S256",
    scope: "email profile",
  }).toString();
  const response = NextResponse.redirect(authorize);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(FLOW_COOKIE, JSON.stringify(flow), { httpOnly: true,
    secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/auth/portal", maxAge: FLOW_MAX_AGE });
  return response;
}

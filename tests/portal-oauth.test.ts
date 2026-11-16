import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { SignJWT, type JWTPayload } from "jose";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), profile: vi.fn(), fetch: vi.fn(), setSession: vi.fn(), sessionUser: vi.fn() }));
vi.mock("@/lib/supabase/config", () => ({
  getSupabaseAuthConfig: () => ({ url: "https://auth.example.test", anonKey: "public-test-key" }),
  getSupabasePublicConfig: () => ({ url: "https://auth.example.test", anonKey: "public-test-key", schema: "gtjbticketing" }),
  getSupabaseSchema: () => "gtjbticketing",
}));
vi.mock("@/lib/supabase/data-token", () => ({ getDataToken: vi.fn() }));
vi.mock("@supabase/supabase-js", () => {
  const query = { select: () => query, eq: () => query, maybeSingle: mocks.profile };
  return { createClient: () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc, schema: () => ({ from: () => query }), from: () => query }) };
});
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { setSession: mocks.setSession, getUser: mocks.sessionUser } }) }));

import { verifyPortalToken, sameState, tokenRequest, ACCESS_COOKIE, REFRESH_COOKIE, FLOW_COOKIE } from "../lib/auth/portal-oauth";
import { setOAuthCookies, clearOAuthCookies } from "../lib/auth/portal-session";
import { NextResponse } from "next/server";
import { POST as refresh } from "../app/auth/portal/refresh/route";
import { GET as callback } from "../app/auth/portal/callback/route";
import { GET as start } from "../app/auth/portal/start/route";
import { proxy } from "../proxy";

const now = 1_800_000_000;
const config = { authUrl: "https://auth.example.test", anonKey: "public-test-key", clientId: "ticket-client", clientSecret: "test-secret", redirectUri: "https://ticketing.example.test/auth/portal/callback" };
async function token(claims = {}) {
  return new SignJWT({ sub: "user-1", client_id: config.clientId, exp: now + 900, ...claims })
    .setProtectedHeader({ alg: "HS256" }).setIssuer(`${config.authUrl}/auth/v1`).setAudience("authenticated")
    .sign(new TextEncoder().encode("fixture-signing-key"));
}
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now * 1000);
  vi.stubEnv("TICKETING_OAUTH_CLIENT_ID", config.clientId);
  vi.stubEnv("TICKETING_OAUTH_CLIENT_SECRET", config.clientSecret);
  vi.stubEnv("TICKETING_OAUTH_REDIRECT_URI", config.redirectUri);
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.profile.mockResolvedValue({ data: { account_status: "active", deleted_at: null }, error: null });
  mocks.setSession.mockResolvedValue({ error: null });
  mocks.sessionUser.mockResolvedValue({ data: { user: null }, error: null });
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("portal identity and central eligibility", () => {
  it("accepts an authenticated assigned user with an active profile", async () => {
    expect(await verifyPortalToken(config, await token())).toEqual({ id: "user-1" });
  });
  it.each([false, null])("denies an absent central grant: %j", async (data) => {
    mocks.rpc.mockResolvedValue({ data, error: null });
    expect(await verifyPortalToken(config, await token())).toBeNull();
  });
  it("denies a failed eligibility lookup", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    expect(await verifyPortalToken(config, await token())).toBeNull();
  });
  it.each([null, { account_status: "suspended" }, { account_status: "active", deleted_at: "2026-01-01" }])("denies inactive or missing profiles: %j", async (data) => {
    mocks.profile.mockResolvedValue({ data, error: null });
    expect(await verifyPortalToken(config, await token())).toBeNull();
  });
  it.each([{ client_id: "other-client" }, { sub: "other-user" }, { exp: now }, { exp: "invalid" }, { exp: now + 3600 }, { iss: "https://evil.test/auth/v1" }, { aud: "other-audience" }])("denies invalid token claims: %j", async (claims) => {
    const jwt = await new SignJWT({ sub: "user-1", client_id: config.clientId, exp: now + 900, iss: `${config.authUrl}/auth/v1`, aud: "authenticated", ...claims } as unknown as JWTPayload).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("fixture"));
    expect(await verifyPortalToken(config, jwt)).toBeNull();
  });
  it("does not rely on unverified decoded claims", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid signature" } });
    expect(await verifyPortalToken(config, await token())).toBeNull();
  });
  it("rejects non-ASCII state with the same character count without throwing", () => {
    expect(sameState("a", "é")).toBe(false);
  });
});

describe("OAuth renewal", () => {
  async function request(expiresAt = now + 30) {
    const access = await token({ exp: expiresAt });
    return new NextRequest("https://ticketing.example.test/auth/portal/refresh", { method: "POST", headers: { origin: "https://ticketing.example.test", cookie: `${ACCESS_COOKIE}=${access}; ${REFRESH_COOKIE}=old-refresh` } });
  }
  function tokenReply(access: string) {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ access_token: access, refresh_token: "rotated-refresh", expires_in: 900 }), { status: 200 }));
  }
  it("fails renewal when a previously assigned member loses access", async () => {
    tokenReply(await token()); mocks.rpc.mockResolvedValue({ data: false, error: null });
    const response = await refresh(await request());
    expect(response.status).toBe(401);
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe("");
  });
  it("does not skip policy validation for a still-fresh access token", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    const response = await refresh(await request(now + 900));
    expect(response.status).toBe(401);
  });
  it("replaces the refresh token and bounds access-cookie lifetime", async () => {
    tokenReply(await token());
    const response = await refresh(await request());
    expect(response.status).toBe(200);
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe("rotated-refresh");
    expect(response.cookies.get(ACCESS_COOKIE)?.maxAge).toBeLessThanOrEqual(900);
  });
  it("rejects cross-origin renewal", async () => {
    const response = await refresh(new NextRequest("https://ticketing.example.test/auth/portal/refresh", { method: "POST", headers: { origin: "https://evil.test" } }));
    expect(response.status).toBe(403);
  });
  it("bounds access cookies by the actual token expiry", async () => {
    const request = new NextRequest("https://ticketing.example.test/");
    const response = NextResponse.next();
    setOAuthCookies(request, response, { access_token: await token({ exp: now + 30 }), refresh_token: "refresh", expires_in: 900 });
    expect(response.cookies.get(ACCESS_COOKIE)?.maxAge).toBe(30);
  });
  it("treats token endpoint network failures as a failed exchange", async () => {
    mocks.fetch.mockRejectedValue(new Error("offline"));
    expect(await tokenRequest(config, new URLSearchParams({ grant_type: "refresh_token", refresh_token: "old" }))).toBeNull();
  });
  it("clears the matching SSR session when portal access is rejected", () => {
    const request = new NextRequest("https://ticketing.example.test/", { headers: { cookie: "sb-auth-auth-token.0=old; unrelated=keep" } });
    const response = NextResponse.next();
    clearOAuthCookies(response, request);
    expect(response.cookies.get("sb-auth-auth-token.0")?.value).toBe("");
    expect(response.cookies.get("unrelated")).toBeUndefined();
  });
});

describe("callback and direct navigation", () => {
  it.each(["next-router-prefetch", "purpose", "sec-purpose"])("does not replace a login flow during prefetch: %s", async (name) => {
    const response = await start(new NextRequest("https://ticketing.example.test/auth/portal/start", { headers: { [name]: name === "next-router-prefetch" ? "1" : "prefetch" } }));
    expect(response.status).toBe(204);
    expect(response.cookies.get(FLOW_COOKIE)).toBeUndefined();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("clears the flow at its original cookie path after invalid state", async () => {
    const flow = encodeURIComponent(JSON.stringify({ state: "expected", verifier: "test", next: "/dashboard" }));
    const response = await callback(new NextRequest("https://ticketing.example.test/auth/portal/callback?state=wrong&code=test", { headers: { cookie: `${FLOW_COOKIE}=${flow}` } }));
    expect(new URL(response.headers.get("location")!).searchParams.get("portalError")).toBe("state");
    expect(response.cookies.get(FLOW_COOKIE)?.path).toBe("/auth/portal");
    expect(response.cookies.get(ACCESS_COOKIE)).toBeUndefined();
  });
  it("re-enters OAuth for a protected page without an app session", async () => {
    const response = await proxy(new NextRequest("https://ticketing.example.test/tickets/123?tab=history"));
    const target = new URL(response.headers.get("location")!);
    expect(target.pathname).toBe("/auth/portal/start");
    expect(target.searchParams.get("next")).toBe("/tickets/123?tab=history");
  });
  it("keeps native recovery login reachable", async () => {
    const response = await proxy(new NextRequest("https://ticketing.example.test/login?portalError=expired"));
    expect(response.headers.get("location")).toBeNull();
  });
  it("does not send JSON requests into interactive login", async () => {
    const response = await proxy(new NextRequest("https://ticketing.example.test/tickets", { headers: { accept: "application/json" } }));
    expect(response.status).toBe(401);
  });
});

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { decodeJwt } from "jose";
import { createClient as createAuthClient } from "@supabase/supabase-js";
import { getSupabaseAuthConfig, getSupabasePublicConfig } from "@/lib/supabase/config";
import { getDataToken } from "@/lib/supabase/data-token";
import { safeInternalNext } from "@/lib/auth-redirect";

export const FLOW_COOKIE = "ticketing_portal_flow";
export const ACCESS_COOKIE = "ticketing_portal_access";
export const REFRESH_COOKIE = "ticketing_portal_refresh";
export const FLOW_MAX_AGE = 600;

export type PortalFlow = { state: string; verifier: string; next: string };
export type OAuthTokens = { access_token: string; refresh_token: string; expires_in: number };

export function portalConfig(origin: string) {
  const { url, anonKey } = getSupabaseAuthConfig();
  const clientId = process.env.TICKETING_OAUTH_CLIENT_ID;
  const clientSecret = process.env.TICKETING_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.TICKETING_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri || new URL(redirectUri).origin !== origin) {
    throw new Error("Ticketing portal OAuth is not configured for this origin.");
  }
  return { authUrl: url.replace(/\/$/, ""), anonKey, clientId, clientSecret, redirectUri };
}

export function newFlow(next: string | null): PortalFlow {
  return { state: randomBytes(32).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"), next: safeInternalNext(next) };
}

export function challenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function sameState(expected: string, actual: string | null) {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual ?? "");
  return !!actual && left.length === right.length && timingSafeEqual(left, right);
}

export async function tokenRequest(config: ReturnType<typeof portalConfig>, body: URLSearchParams): Promise<OAuthTokens | null> {
  try {
  const response = await fetch(`${config.authUrl}/auth/v1/oauth/token`, {
    method: "POST", cache: "no-store", headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    }, body,
  });
  if (!response.ok) return null;
  const tokens = await response.json() as Partial<OAuthTokens>;
  const refreshToken = tokens.refresh_token || body.get("refresh_token");
  if (typeof tokens.access_token !== "string" || typeof refreshToken !== "string"
    || typeof tokens.expires_in !== "number" || tokens.expires_in < 1) return null;
  return { access_token: tokens.access_token, refresh_token: refreshToken, expires_in: tokens.expires_in };
  } catch { return null; }
}

export async function verifyPortalToken(config: ReturnType<typeof portalConfig>, token: string) {
  const auth = createAuthClient(config.authUrl, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  try {
    const { data: { user }, error } = await auth.auth.getUser(token);
    if (error || !user) return null;
    const claims = decodeJwt(token);
    const now = Date.now() / 1000;
    if (claims.client_id !== config.clientId || claims.sub !== user.id
      || claims.iss !== `${config.authUrl}/auth/v1`
      || !(claims.aud === "authenticated" || Array.isArray(claims.aud) && claims.aud.includes("authenticated"))
      || typeof claims.exp !== "number" || !Number.isFinite(claims.exp) || claims.exp <= now || claims.exp > now + 900) return null;
    const allowed = await auth.rpc("aideck_can_access_app", { app_key: "ticketing" });
    if (allowed.error || allowed.data !== true) return null;
    const dataConfig = getSupabasePublicConfig();
    const data = dataConfig.url === config.authUrl ? auth : createAuthClient(dataConfig.url, dataConfig.anonKey, {
      accessToken: async () => (await getDataToken(token)).token,
    });
    const profile = await data.schema(dataConfig.schema).from("profiles").select("account_status,deleted_at").eq("id", user.id).maybeSingle();
    if (profile.error || profile.data?.account_status !== "active" || profile.data.deleted_at) return null;
    return user;
  } catch { return null; }
}

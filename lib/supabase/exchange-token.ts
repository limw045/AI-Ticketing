import { createClient } from "@supabase/supabase-js";
import { decodeJwt, SignJWT } from "jose";

export class TokenExchangeError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Verify against the configured Auth server before signing any data-project JWT. */
export async function exchangeDataToken(
  accessToken: string,
  config: { authUrl: string; authKey: string; dataUrl: string; signingSecret: string },
) {
  if (!config.signingSecret || config.signingSecret.length < 32) {
    throw new TokenExchangeError("Shared login is not configured for this environment.", 503);
  }
  const auth = createClient(config.authUrl, config.authKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: { user }, error } = await auth.auth.getUser(accessToken);
  if (error || !user || !user.email || !user.email_confirmed_at) {
    throw new TokenExchangeError("A verified account is required.", 401);
  }
  let claims;
  try { claims = decodeJwt(accessToken); }
  catch { throw new TokenExchangeError("Invalid login session.", 401); }
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== `${config.authUrl.replace(/\/$/, "")}/auth/v1`
    || claims.sub !== user.id || claims.role !== "authenticated"
    || !(Array.isArray(claims.aud) ? claims.aud.includes("authenticated") : claims.aud === "authenticated")
    || !claims.exp || claims.exp <= now) {
    throw new TokenExchangeError("Invalid login session.", 401);
  }
  const expiresAt = Math.min(now + 300, claims.exp);
  const token = await new SignJWT({ role: "authenticated", email: user.email,
    app_metadata: { provider: "ticketing-shared-auth" } })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id).setAudience("authenticated")
    .setIssuer(`${config.dataUrl.replace(/\/$/, "")}/auth/v1`)
    .setIssuedAt(now).setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(config.signingSecret));
  return { token, expiresAt };
}

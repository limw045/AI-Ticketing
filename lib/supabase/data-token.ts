import "server-only";
import { getSupabaseAuthConfig, getSupabasePublicConfig } from "./config";
import { exchangeDataToken } from "./exchange-token";

export function getDataToken(accessToken: string) {
  const auth = getSupabaseAuthConfig();
  const data = getSupabasePublicConfig();
  return exchangeDataToken(accessToken, {
    authUrl: auth.url, authKey: auth.anonKey, dataUrl: data.url,
    signingSecret: process.env.SUPABASE_DATA_JWT_SECRET || "",
  });
}

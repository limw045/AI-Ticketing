import { createBrowserClient } from "@supabase/ssr";
import { createClient as createDataClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAuthConfig, getSupabasePublicConfig } from "@/lib/supabase/config";

let sharedClient: SupabaseClient<any, string> | undefined;

export function createClient() {
  const { url, anonKey, schema } = getSupabasePublicConfig();
  const authConfig = getSupabaseAuthConfig();
  if (authConfig.url !== url) {
    if (sharedClient) return sharedClient;
    const auth = createBrowserClient(authConfig.url, authConfig.anonKey);
    let cached: { sessionToken: string; token: string; expiresAt: number } | undefined;
    let pending: { sessionToken: string; promise: Promise<string> } | undefined;
    const accessToken = async () => {
      const { data: { session } } = await auth.auth.getSession();
      if (!session) { cached = undefined; return null; }
      const sessionToken = session.access_token;
      if (cached?.sessionToken === sessionToken && cached.expiresAt > Date.now() / 1000 + 30) return cached.token;
      if (pending?.sessionToken === sessionToken) return pending.promise;
      const promise = (async () => {
        const response = await fetch("/api/auth/data-token", {
          method: "POST", headers: { Authorization: `Bearer ${sessionToken}` }, cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok || !result.token) throw new Error(result.error || "Unable to connect your login to Ticketing.");
        cached = { sessionToken, token: result.token, expiresAt: result.expiresAt };
        return result.token as string;
      })();
      pending = { sessionToken, promise };
      try { return await promise; } finally { if (pending?.promise === promise) pending = undefined; }
    };
    const data = createDataClient(url, anonKey, { db: { schema }, accessToken });
    // Keep existing call sites using one facade: Auth belongs to the shared
    // identity project; REST, Storage and Realtime belong to the data project.
    data.auth = auth.auth;
    auth.auth.onAuthStateChange((event) => {
      cached = undefined;
      if (event === "SIGNED_OUT") { void data.removeAllChannels(); return; }
      // Auth callbacks run under its session lock. Exchange only after it releases.
      setTimeout(() => { void data.realtime.setAuth().catch(() => undefined); }, 0);
    });
    sharedClient = data;
    return data;
  }
  return createBrowserClient(url, anonKey, { db: { schema } });
}

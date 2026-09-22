import { createClient } from "@supabase/supabase-js";
import { getSupabaseAuthConfig } from "./config";

/** Recovery links can be opened in a different browser from the requesting one. */
export function createRecoveryClient() {
  const { url, anonKey } = getSupabaseAuthConfig();
  return createClient(url, anonKey, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

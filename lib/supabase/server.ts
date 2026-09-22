import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createDataClient } from "@supabase/supabase-js";
import { getSupabaseAuthConfig, getSupabasePublicConfig } from "@/lib/supabase/config";
import { getDataToken } from "@/lib/supabase/data-token";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey, schema } = getSupabasePublicConfig();
  const authConfig = getSupabaseAuthConfig();

  const auth = createServerClient(
    authConfig.url,
    authConfig.anonKey,
    {
      db: { schema },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Handled in Server Components
          }
        },
      },
    }
  );
  if (authConfig.url === url) return auth;
  let pending: Promise<string> | undefined;
  const data = createDataClient(url, anonKey, {
    db: { schema },
    accessToken: async () => {
      const { data: { session } } = await auth.auth.getSession();
      if (!session) return null;
      pending ??= getDataToken(session.access_token).then(result => result.token);
      return pending;
    },
  });
  data.auth = auth.auth;
  return data;
}

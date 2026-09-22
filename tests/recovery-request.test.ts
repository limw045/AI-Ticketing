import { afterEach, describe, expect, it, vi } from "vitest";
import { createRecoveryClient } from "../lib/supabase/recovery";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("cross-browser password recovery request", () => {
  it("uses the exact allowed callback and sends no browser-bound PKCE challenge", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://data.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_AUTH_URL", "https://shared.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY", "test-auth-key");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { error } = await createRecoveryClient().auth.resetPasswordForEmail("test@example.invalid", {
      redirectTo: "https://gt-ai-ticketing.vercel.app/auth/callback",
    });
    expect(error).toBeNull();
    const [input, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const url = new URL(input);
    expect(url.origin).toBe("https://shared.supabase.co");
    expect(url.pathname).toBe("/auth/v1/recover");
    expect(url.searchParams.get("redirect_to")).toBe("https://gt-ai-ticketing.vercel.app/auth/callback");
    const body = JSON.parse(String(init.body));
    expect(body.code_challenge).toBeNull();
    expect(body.code_challenge_method).toBeNull();
  });
});

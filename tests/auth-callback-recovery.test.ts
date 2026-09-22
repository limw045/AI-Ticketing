import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";

const { exchangeCodeForSession, signOut } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(), signOut: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { exchangeCodeForSession, signOut },
}) }));
import { GET } from "../app/auth/callback/route";

beforeEach(() => { exchangeCodeForSession.mockReset(); signOut.mockReset(); });
describe("exact callback URL password recovery", () => {
  it("routes verified recovery to reset-password without a next query", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { redirectType: "recovery" }, error: null });
    const response = await GET(new NextRequest("https://gt-ai-ticketing.vercel.app/auth/callback?code=test"));
    expect(response.headers.get("location")).toBe("https://gt-ai-ticketing.vercel.app/reset-password");
    expect(signOut).not.toHaveBeenCalled();
  });
  it("prioritizes recovery over a conflicting next destination", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { redirectType: "recovery" }, error: null });
    const response = await GET(new NextRequest("https://gt-ai-ticketing.vercel.app/auth/callback?code=test&next=/dashboard"));
    expect(response.headers.get("location")).toBe("https://gt-ai-ticketing.vercel.app/reset-password");
  });
  it("retains email confirmation behavior", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { redirectType: null }, error: null });
    const response = await GET(new NextRequest("https://gt-ai-ticketing.vercel.app/auth/callback?code=test"));
    expect(response.headers.get("location")).toBe("https://gt-ai-ticketing.vercel.app/login?verified=1");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("does not open recovery when the code exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { redirectType: null }, error: new Error("Expired") });
    const response = await GET(new NextRequest("https://gt-ai-ticketing.vercel.app/auth/callback?code=expired"));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/reset-password");
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("recovery_session_missing");
  });
  it("sends fragment-based recovery to the client reset page without exchanging a code", async () => {
    const response = await GET(new NextRequest("https://gt-ai-ticketing.vercel.app/auth/callback"));
    expect(response.headers.get("location")).toBe("https://gt-ai-ticketing.vercel.app/reset-password");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it("requests only the exact allowlisted callback for recovery and signup", () => {
    for (const path of ["app/forgot-password/page.tsx", "app/register/page.tsx"]) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain('`${window.location.origin}/auth/callback`');
      expect(source).not.toContain('/auth/callback?next=');
    }
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { decodeJwt, jwtVerify } from "jose";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getUser } }) }));
import { exchangeDataToken } from "../lib/supabase/exchange-token";

const config = { authUrl: "https://identity.supabase.co", authKey: "public-key",
  dataUrl: "https://development.supabase.co", signingSecret: "test-secret-that-is-at-least-thirty-two-characters" };
const uid = "041158aa-483e-44e3-b9a5-cad417ac7f40";
const session = (changes: Record<string, unknown> = {}) => {
  const payload = { sub: uid, iss: config.authUrl + "/auth/v1", aud: "authenticated",
    role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, ...changes };
  return `${Buffer.from('{"alg":"ES256"}').toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
};
beforeEach(() => {
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: uid, email: "employee@example.com",
    email_confirmed_at: "2026-01-01T00:00:00Z", user_metadata: { role: "super_admin" } } }, error: null });
});

describe("shared Auth data token exchange", () => {
  it("verifies Auth first and signs only an authenticated, short-lived data identity", async () => {
    const input = session({ email: "forged@example.com", user_metadata: { role: "super_admin" } });
    const result = await exchangeDataToken(input, config);
    expect(getUser).toHaveBeenCalledWith(input);
    const { payload } = await jwtVerify(result.token, new TextEncoder().encode(config.signingSecret), {
      algorithms: ["HS256"], issuer: config.dataUrl + "/auth/v1", audience: "authenticated",
    });
    expect(payload.sub).toBe(uid);
    expect(payload.email).toBe("employee@example.com");
    expect(payload.role).toBe("authenticated");
    expect(payload.user_metadata).toBeUndefined();
    expect(payload.exp! - payload.iat!).toBe(300);
  });
  it("does not extend the lifetime of a nearly expired Auth session", async () => {
    const exp = Math.floor(Date.now() / 1000) + 45;
    const result = await exchangeDataToken(session({ exp }), config);
    expect(decodeJwt(result.token).exp).toBe(exp);
  });
  it("rejects sessions the Auth server cannot validate", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "Invalid JWT" } });
    await expect(exchangeDataToken(session(), config)).rejects.toMatchObject({ status: 401 });
  });
  it.each([
    { iss: "https://untrusted.supabase.co/auth/v1" }, { sub: "another-user" },
    { role: "service_role" }, { aud: "service_role" }, { exp: 1 },
  ])("rejects mismatched or elevated claims: %j", async (claims) => {
    await expect(exchangeDataToken(session(claims), config)).rejects.toMatchObject({ status: 401 });
  });
  it("does not issue data access to an unconfirmed email", async () => {
    getUser.mockResolvedValue({ data: { user: { id: uid, email: "employee@example.com" } }, error: null });
    await expect(exchangeDataToken(session(), config)).rejects.toMatchObject({ status: 401 });
  });
  it("fails closed without server signing configuration", async () => {
    await expect(exchangeDataToken(session(), { ...config, signingSecret: "" })).rejects.toMatchObject({ status: 503 });
    expect(getUser).not.toHaveBeenCalled();
  });
});

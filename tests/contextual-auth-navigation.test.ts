import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { destinationForPortal, safeInternalNext } from "../lib/auth-redirect";

const proxy = readFileSync("proxy.ts", "utf8");
const login = readFileSync("app/login/page.tsx", "utf8");
const home = readFileSync("app/page.tsx", "utf8");

describe("contextual authentication navigation", () => {
  it("keeps safe internal destinations and rejects external redirects", () => {
    expect(safeInternalNext("/faq?category=VPN")).toBe("/faq?category=VPN");
    expect(safeInternalNext("//evil.example")).toBe("/dashboard");
  });

  it("lets an admin choose a portal before returning to the original destination", () => {
    expect(destinationForPortal("admin", "/faq")).toBe("/faq");
    expect(destinationForPortal("user", "/tickets/123")).toBe("/tickets/123");
    expect(destinationForPortal("user", "/admin/tickets")).toBe("/dashboard");
    expect(login).toContain("destinationForPortal(mode, requestedNext)");
  });

  it("protects Knowledge and preserves next through the proxy", () => {
    expect(proxy).toContain('["/tickets", "/faq", "/admin", "/dashboard"]');
    expect(proxy).toContain('searchParams.set("next"');
  });

  it("prioritizes sign-in, keeps one registration CTA, and links footer Home correctly", () => {
    expect(home.match(/href="\/register"/g)).toHaveLength(1);
    expect(home).toContain('href="/" className="hover:text-[var(--ink)]"');
    expect(home).toContain("Sign in <ArrowRight");
  });
});

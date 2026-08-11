import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAdminPortalPath } from "../lib/portal-mode";

const workspaceShell = readFileSync(
  new URL("../components/workspace/WorkspaceShell.tsx", import.meta.url),
  "utf8"
);

describe("Admin Portal path synchronization", () => {
  it.each(["/admin", "/admin/dashboard", "/admin/tickets", "/admin/system-logs"])(
    "recognizes %s as an Admin Portal path",
    (pathname) => expect(isAdminPortalPath(pathname)).toBe(true)
  );

  it.each(["/dashboard", "/tickets", "/tickets/admin", "/faq"])(
    "does not treat %s as an Admin Portal path",
    (pathname) => expect(isAdminPortalPath(pathname)).toBe(false)
  );

  it("switches mode on link intent and corrects direct Admin visits", () => {
    expect(workspaceShell).toContain("onNavigate?: (href: string) => void");
    expect(workspaceShell).toContain("onNavigate?.(item.href)");
    expect(workspaceShell).toContain("if (isAdminPortalPath(href))");
    expect(workspaceShell).toContain("if (isAdminPortalPath(pathname))");
    expect(workspaceShell).toContain('setPortalMode("admin")');
    expect(workspaceShell).toContain('setPortalModeState("admin")');
  });
});

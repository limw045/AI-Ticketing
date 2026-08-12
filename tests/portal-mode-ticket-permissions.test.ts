import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  new URL("../app/(workspace)/tickets/page.tsx", import.meta.url),
  "utf8"
);

describe("strict user portal ticket behavior", () => {
  it("uses portal mode to separate user and admin capabilities", () => {
    expect(page).toContain("getPortalMode");
    expect(page).toContain('portalMode === "admin"');
    expect(page).toContain("canManageQueue");
  });

  it("offers My requests and Department requests without admin shortcut copy", () => {
    expect(page).toContain("My requests");
    expect(page).toContain("Department requests");
    expect(page).not.toContain("M assigns yourself, C closes");
  });
});

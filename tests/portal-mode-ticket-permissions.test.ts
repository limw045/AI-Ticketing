import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  new URL("../app/(workspace)/tickets/page.tsx", import.meta.url),
  "utf8"
);
const detail = readFileSync(
  new URL("../app/(workspace)/tickets/[id]/page.tsx", import.meta.url),
  "utf8"
);
const dashboard = readFileSync(
  new URL("../app/(workspace)/dashboard/page.tsx", import.meta.url),
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

  it("scopes administrator data queries when the User Portal is active", () => {
    expect(page).toContain("department_id.eq.${profile.department_id}");
    expect(dashboard).toContain("department_id.eq.${profileData.department_id}");
    expect(detail).toContain('commentQuery.eq("is_internal_note", false)');
    expect(detail).toContain("ticketData.department_id === profile.department_id");
    expect(page).toContain('activePortalMode === "admin" ? managementSelect : userPortalSelect');
    expect(dashboard).toContain('activePortalMode === "admin" ? managementSelect : userPortalSelect');
    expect(page).not.toContain('const userPortalSelect = "*');
  });
});

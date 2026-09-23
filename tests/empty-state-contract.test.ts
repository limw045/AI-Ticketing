import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const staff = readFileSync("components/admin/StaffManagement.tsx", "utf8");
const tickets = readFileSync("app/(workspace)/admin/tickets/page.tsx", "utf8");
const newTicket = readFileSync("app/(workspace)/tickets/new/page.tsx", "utf8");

describe("list empty-state contract", () => {
  it("distinguishes filtered emptiness from initial emptiness", () => {
    expect(staff).toContain('"No matching staff"');
    expect(staff).toContain('"No staff accounts yet"');
    expect(tickets).toContain('"No matching tickets"');
    expect(tickets).toContain('"No tickets yet"');
    expect(tickets).toContain('"Clear filters"');
    expect(staff).toContain("Try a broader search or reset the active filters.");
  });

  it("preserves the approved ticket submission sticky action region", () => {
    expect(newTicket).toContain("safe-area-bottom sticky bottom-0");
  });
});

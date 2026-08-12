import { describe, expect, it } from "vitest";
import { accountStatusLabel, accountTypeLabel, priorityLabel, roleLabel, ticketStatusLabel } from "../lib/display-labels";
import { readFileSync } from "node:fs";

const adminTickets = readFileSync("app/(workspace)/admin/tickets/page.tsx", "utf8");

describe("shared display labels", () => {
  it("formats stored enum values consistently without changing wire values", () => {
    expect(ticketStatusLabel("in_progress")).toBe("In progress");
    expect(priorityLabel("urgent")).toBe("P0 Urgent");
    expect(roleLabel("super_admin")).toBe("Super Admin");
    expect(accountTypeLabel("full_time")).toBe("Full-time");
    expect(accountStatusLabel("suspended")).toBe("Suspended");
  });

  it("provides a readable fallback and an em dash for missing data", () => {
    expect(ticketStatusLabel("waiting_for_vendor")).toBe("Waiting For Vendor");
    expect(ticketStatusLabel(null)).toBe("—");
  });

  it("uses shared priority labels in admin edit and filter options", () => {
    expect(adminTickets.match(/\{priorityLabel\(priority\)\}/g)).toHaveLength(2);
  });
});

import { describe, expect, it } from "vitest";
import { accountStatusLabel, accountTypeLabel, priorityLabel, roleLabel, ticketStatusLabel } from "../lib/display-labels";

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
});

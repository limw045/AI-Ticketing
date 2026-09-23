import { describe, expect, it } from "vitest";
import { auditActionLabel, auditTarget, shortRecordId } from "../lib/admin/audit-display";

describe("audit log scan labels", () => {
  it("shows a useful target instead of a raw identifier when one is recorded", () => {
    const id = "120e9b61-4a72-4ffe-b176-9551eda5f9ba";
    expect(auditTarget({ entity_id: id, changed_fields: { category_name: "RiskScreen" } })).toBe("RiskScreen");
    expect(auditTarget({ entity_id: id, changed_fields: {} })).toBe("120e9b61…f9ba");
    expect(shortRecordId(id)).toBe("120e9b61…f9ba");
  });

  it("uses action words an administrator can scan", () => {
    expect(auditActionLabel("insert")).toBe("Created");
    expect(auditActionLabel("update")).toBe("Updated");
  });
});

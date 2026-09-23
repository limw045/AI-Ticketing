import { describe, expect, it } from "vitest";
import { formatAuditTime, formatDate, formatDateFilter, formatDateTime, parseDateFilter } from "../lib/date-display";

describe("workspace date display", () => {
  it("uses unambiguous English dates in Malaysia time", () => {
    expect(formatDate("2026-09-22T17:00:00Z")).toBe("23 Sep 2026");
    expect(formatDateTime("2026-09-23T02:13:00Z")).toBe("23 Sep 2026, 10:13");
    expect(formatAuditTime("2026-09-23T02:13:46Z")).toBe("23 Sep 2026, 10:13:46 MYT");
  });

  it("keeps filter values in ISO format and rejects impossible dates", () => {
    expect(formatDateFilter("2026-09-23")).toBe("23/09/2026");
    expect(parseDateFilter("23/09/2026")).toBe("2026-09-23");
    expect(parseDateFilter("31/02/2026")).toBeNull();
    expect(parseDateFilter("2026/09/23")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  buildDeptCsv,
  formatFilenameDate,
  getCategoryData,
  getDeptData,
  getDeptOptions,
  getPeriod,
  getResolutionRate,
  getTopCategory,
  getTrend,
  ticketsInRange,
} from "../lib/dashboard-charts";

const t = (
  created_at: string,
  category = "Risk Screen",
  department = "AI"
) => ({
  created_at,
  category,
  author: { department },
});

describe("getPeriod", () => {
  const now = new Date(2026, 7, 11, 15, 30); // 2026-08-11

  it("Today spans just the local day and compares to Yesterday", () => {
    const p = getPeriod("Today", now);
    expect(p.current.start.getDate()).toBe(11);
    expect(p.current.end.getDate()).toBe(11);
    expect(p.previous.start.getDate()).toBe(10);
    expect(p.previous.end.getDate()).toBe(10);
  });

  it("Yesterday is the day before Today", () => {
    const p = getPeriod("Yesterday", now);
    expect(p.current.start.getDate()).toBe(10);
    expect(p.current.end.getDate()).toBe(10);
    expect(p.previous.start.getDate()).toBe(9);
  });

  it("Last 7 days covers six prior days plus today, inclusive", () => {
    const p = getPeriod("Last 7 days", now);
    expect(p.current.start.getDate()).toBe(5);
    expect(p.current.end.getDate()).toBe(11);
    expect(p.previous.start.getDate()).toBe(29); // July 29
    expect(p.previous.start.getMonth()).toBe(6);
    expect(p.previous.end.getDate()).toBe(4); // Aug 4
    expect(p.previousEndExclusive.getDate()).toBe(5);
  });

  it("Last 30 days and Last 90 days use their window sizes", () => {
    const d30 = getPeriod("Last 30 days", now);
    expect(d30.current.start.getDate()).toBe(13);
    expect(d30.current.end.getDate()).toBe(11);
    expect(d30.previous.start.getDate()).toBe(13); // June 13
    expect(d30.previous.start.getMonth()).toBe(5);
    const d90 = getPeriod("Last 90 days", now);
    expect(d90.current.start.getDate()).toBe(14);
    expect(d90.current.end.getDate()).toBe(11);
    expect(d90.previous.start.getDate()).toBe(13); // Feb 13
    expect(d90.previous.start.getMonth()).toBe(1);
    expect(d90.previous.end.getDate()).toBe(13); // May 13
    expect(d90.previous.end.getMonth()).toBe(4);
  });

  it("handles month boundaries", () => {
    const p = getPeriod("Last 7 days", new Date(2026, 2, 3)); // 2026-03-03
    expect(p.current.start.getDate()).toBe(25);
    expect(p.current.start.getMonth()).toBe(1); // Feb 25
    expect(p.previous.start.getDate()).toBe(18); // Feb 18
    expect(p.previous.start.getMonth()).toBe(1);
    expect(p.previous.end.getDate()).toBe(24);
    expect(p.previous.end.getMonth()).toBe(1);
  });
});

describe("ticketsInRange", () => {
  const now = new Date(2026, 7, 11, 12);
  const p = getPeriod("Last 7 days", now);

  it("filters by inclusive local day boundaries", () => {
    const list = [
      t("2026-08-04T00:00:00Z", "A"), // Aug 4 local time → outside
      t("2026-08-11T10:00:00Z", "A"),
    ];
    const out = ticketsInRange(list, p.current.start, p.current.end);
    expect(out.some((x) => x.created_at === "2026-08-11T10:00:00Z")).toBe(true);
    expect(out.some((x) => x.created_at === "2026-08-04T00:00:00Z")).toBe(false);
  });

  it("drops invalid dates", () => {
    const out = ticketsInRange(
      [t("not-a-date", "A")],
      p.current.start,
      p.current.end
    );
    expect(out).toHaveLength(0);
  });
});

describe("getTrend", () => {
  it("computes percentage change", () => {
    expect(getTrend(10, 20)).toEqual({ pct: "-50.0%", direction: "down" });
    expect(getTrend(15, 10)).toEqual({ pct: "50.0%", direction: "up" });
  });

  it("handles zero denominators", () => {
    expect(getTrend(0, 0)).toEqual({ pct: "0%", direction: "flat" });
    expect(getTrend(5, 0)).toEqual({ pct: "New", direction: "new" });
  });
});

describe("aggregation", () => {
  it("aggregates categories sorted by count desc, then name asc", () => {
    const out = getCategoryData([
      t("2026-08-11T00:00:00Z", "System Bug"),
      t("2026-08-11T00:00:00Z", "Risk Screen"),
      t("2026-08-11T00:00:00Z", "Risk Screen"),
    ]);
    expect(out).toEqual([
      { name: "Risk Screen", count: 2 },
      { name: "System Bug", count: 1 },
    ]);
  });

  it("buckets missing categories as Uncategorized", () => {
    const out = getCategoryData([
      { created_at: "2026-08-11T00:00:00Z", author: { department: "AI" } },
    ]);
    expect(out[0].name).toBe("Uncategorized");
  });

  it("derives department options and falls back to General", () => {
    const list = [
      t("2026-08-11T00:00:00Z", "A", "Finance"),
      { created_at: "2026-08-11T00:00:00Z", category: "B", author: null },
    ];
    expect(getDeptOptions(list)).toEqual(["Finance", "General"]);
  });

  it("filters department data by selection and drops unknown names", () => {
    const list = [
      t("2026-08-11T00:00:00Z", "A", "AI"),
      t("2026-08-11T00:00:00Z", "B", "Finance"),
    ];
    expect(getDeptData(list, ["AI"])).toEqual([{ name: "AI", value: 1 }]);
    expect(getDeptData(list, [])).toEqual([]);
  });
});

describe("metrics and export", () => {
  it("computes resolution rate from resolved/closed", () => {
    const list = [
      { created_at: "2026-08-11T00:00:00Z", category: "A", status: "resolved" },
      { created_at: "2026-08-11T00:00:00Z", category: "A", status: "open" },
      { created_at: "2026-08-11T00:00:00Z", category: "A", status: "closed" },
    ];
    expect(getResolutionRate(list)).toBe(67);
    expect(getResolutionRate([])).toBe(0);
  });

  it("returns top category and empty string fallback", () => {
    expect(
      getTopCategory([
        t("2026-08-11T00:00:00Z", "Risk Screen"),
        t("2026-08-11T00:00:00Z", "Risk Screen"),
      ])
    ).toBe("Risk Screen");
    expect(getTopCategory([])).toBe("");
  });

  it("builds a CSV with headers and rows", () => {
    const csv = buildDeptCsv([t("2026-08-11T00:00:00Z", "A", "AI")]);
    expect(csv).toContain(
      '"Ticket Number","Title","Category","Priority","Status","Department","Created At"'
    );
    expect(csv).toContain("AI");
  });

  it("formats local dates as YYYY-MM-DD", () => {
    expect(formatFilenameDate(new Date(2026, 7, 11))).toBe("2026-08-11");
  });
});

import { describe, expect, it } from "vitest";
import { buildRequestActivity } from "../lib/request-activity";

const timestamp = (day: number, hour = 12) => new Date(2026, 8, day, hour).toISOString();

describe("request activity", () => {
  it("counts a resolution in its own period even if the request was created earlier", () => {
    const result = buildRequestActivity([{ created_at: timestamp(1), resolved_at: timestamp(22, 8) }], 7, new Date(2026, 8, 22, 12));
    expect(result.reduce((sum, day) => sum + day.opened, 0)).toBe(0);
    expect(result.at(-1)?.resolved).toBe(1);
  });
  it("includes the first midnight and excludes the preceding day, future events, and invalid timestamps", () => {
    const result = buildRequestActivity([
      { created_at: timestamp(16, 0) },
      { created_at: timestamp(15, 23) },
      { created_at: timestamp(22, 15) },
      { created_at: "invalid", resolved_at: null },
    ], 7, new Date(2026, 8, 22, 12));
    expect(result[0].opened).toBe(1);
    expect(result.reduce((sum, day) => sum + day.opened, 0)).toBe(1);
    expect(result.every(day => day.resolved === 0)).toBe(true);
  });
  it("keeps empty calendar days across month boundaries without inventing activity", () => {
    const result = buildRequestActivity([], 7, new Date(2026, 9, 2));
    expect(result).toHaveLength(7);
    expect(result[0].label).toBe("26 Sept");
    expect(result.at(-1)?.label).toBe("2 Oct");
    expect(result.every(day => day.opened === 0 && day.resolved === 0)).toBe(true);
  });
  it("rejects an invalid date range", () => {
    expect(() => buildRequestActivity([], 0)).toThrow(RangeError);
    expect(() => buildRequestActivity([], 1.5)).toThrow(RangeError);
  });
});

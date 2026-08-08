import { describe, expect, it } from "vitest";
import { buildCsv, escapeCsvCell } from "../lib/csv";

describe("CSV export", () => {
  it("quotes commas and double quotes", () => {
    expect(escapeCsvCell('A, "quoted" title')).toBe('"A, ""quoted"" title"');
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(escapeCsvCell("=HYPERLINK(\"https://example.com\")")).toBe(
      '"\'=HYPERLINK(""https://example.com"")"'
    );
    expect(escapeCsvCell("  @SUM(1,2)")).toBe('"\'  @SUM(1,2)"');
  });

  it("uses CRLF-separated rows", () => {
    expect(buildCsv([["A", "B"], [1, 2]])).toBe('"A","B"\r\n"1","2"');
  });
});

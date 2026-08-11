import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

describe("homepage automation positioning", () => {
  it("states the automation-first positioning", () => {
    expect(page).toContain("One place to report, trace, and resolve automation issues.");
    expect(page).toContain("Automation-ready intake");
    expect(page).toContain("Trace every case");
    expect(page).toContain("Resolve recurring issues faster");
  });

  it("keeps the internal entry-point CTAs", () => {
    expect(page).toContain("Open ticketing workspace");
    expect(page).toContain("Create staff account");
    expect(page).toContain("Create account");
  });
});

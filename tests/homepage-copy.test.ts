import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

describe("homepage automation positioning", () => {
  it("states the automation-first positioning", () => {
    expect(page).toContain("A little help.");
    expect(page).toContain("connected automations can report issues");
    expect(page).toContain("Every update stays with the ticket.");
    expect(page).toContain("Authenticated internal Knowledge");
  });

  it("keeps the internal entry-point CTAs", () => {
    expect(page).toContain("Open your workspace");
    expect(page).toContain("Create an account");
    expect(page.match(/href="\/register"/g)).toHaveLength(1);
  });
});

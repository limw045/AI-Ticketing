import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("active ticket visibility", () => {
  it.each([
    "app/(workspace)/dashboard/page.tsx",
    "app/(workspace)/tickets/page.tsx",
    "app/(workspace)/admin/dashboard/page.tsx",
  ])("excludes soft-deleted tickets in %s", (path) => {
    const source = read(path);
    expect(source).toMatch(/\.from\("tickets"\)[\s\S]*?\.is\("deleted_at", null\)/);
  });

  it("uses an active-only primary detail query and a deleted admin fallback", () => {
    const source = read("app/(workspace)/tickets/[id]/page.tsx");
    expect(source).toMatch(
      /\.from\("tickets"\)[\s\S]*?\.eq\("id", ticketId\)[\s\S]*?\.is\("deleted_at", null\)/
    );
    expect(source).toContain("deletedTicket");
    expect(source).toContain("This ticket has been moved to the recycle bin.");
    expect(source).toContain('href="/admin/recycle-bin"');
  });
});

describe("operational metrics", () => {
  it("does not count up queue and requester status values", () => {
    const dashboard = read("app/(workspace)/dashboard/page.tsx");
    const tickets = read("app/(workspace)/tickets/page.tsx");
    expect(dashboard).not.toMatch(/\banimate\b/);
    expect(tickets).not.toMatch(/\banimate\b/);
  });
});

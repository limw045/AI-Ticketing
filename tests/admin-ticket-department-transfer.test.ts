import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/(workspace)/admin/tickets/page.tsx", "utf8");
const server = readFileSync("lib/admin/server.ts", "utf8");

describe("explicit admin ticket department transfer", () => {
  it("loads controlled departments and saves the selected snapshot", () => {
    expect(page).toContain('.from("departments")');
    expect(page).toContain("Ticket department");
    expect(page).toContain("department_id: form.department_id");
    expect(server).toContain('"department_id"');
  });

  it("explains author continuity at the transfer control", () => {
    expect(page).toContain("the original author keeps access");
  });
});

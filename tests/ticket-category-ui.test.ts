import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const newTicketPage = readFileSync(
  new URL("../app/(workspace)/tickets/new/page.tsx", import.meta.url),
  "utf8"
);
const ticketListPage = readFileSync(
  new URL("../app/(workspace)/tickets/page.tsx", import.meta.url),
  "utf8"
);
const knowledgePage = readFileSync(
  new URL("../app/(workspace)/admin/knowledge/page.tsx", import.meta.url),
  "utf8"
);
const adminTicketsPage = readFileSync(
  new URL("../app/(workspace)/admin/tickets/page.tsx", import.meta.url),
  "utf8"
);

describe("dynamic ticket category UI", () => {
  it("loads active category rules instead of hard-coded ticket options", () => {
    expect(newTicketPage).toContain('.from("category_rules")');
    expect(newTicketPage).toContain('.is("deleted_at", null)');
    expect(newTicketPage).toContain("sortCategoryRules");
    expect(newTicketPage).not.toContain('<option value="System Bug">');
  });

  it("derives filter options from visible historical tickets", () => {
    expect(ticketListPage).toContain("getHistoricalCategoryOptions(tickets)");
    expect(ticketListPage).not.toContain('<option value="System Bug">');
  });

  it("asks administrators for plain-language guidance", () => {
    expect(knowledgePage).toContain("Tell staff what information to provide");
    expect(knowledgePage).toContain("Do not include code, credentials, or sensitive data");
  });

  it("uses active rules when an administrator changes a ticket category", () => {
    expect(adminTicketsPage).toContain('/api/admin/category-rules?pageSize=100');
    expect(adminTicketsPage).toContain("categoryOptions.map");
  });
});

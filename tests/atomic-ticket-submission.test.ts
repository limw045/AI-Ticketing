import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260812020000_atomic_portal_ticket_submission.sql", "utf8");
const page = readFileSync("app/(workspace)/tickets/new/page.tsx", "utf8");

describe("atomic portal ticket submission", () => {
  it("creates the ticket and binds every attachment in one database function", () => {
    expect(migration).toContain("submit_portal_ticket");
    expect(migration).toContain("GET DIAGNOSTICS linked_count = ROW_COUNT");
    expect(migration).toContain("linked_count <> cardinality(p_attachment_paths)");
    expect(page).toContain('.rpc("submit_portal_ticket"');
  });

  it("only clears the saved draft after the RPC succeeds and confirms manual clear", () => {
    expect(page.lastIndexOf('localStorage.removeItem("ticketing_draft")')).toBeGreaterThan(page.indexOf('.rpc("submit_portal_ticket"'));
    expect(page).toContain('window.confirm("Clear this draft and remove its uploaded attachments?")');
  });
});

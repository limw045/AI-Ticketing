import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260812010000_department_scoped_ticket_access.sql", import.meta.url),
  "utf8"
);

describe("department ticket RLS", () => {
  it("keeps authors and same-department peers on active tickets", () => {
    expect(migration).toContain("author_id = auth.uid()");
    expect(migration).toContain("viewer.department_id = tickets.department_id");
    expect(migration).toContain("tickets.deleted_at IS NULL");
  });

  it("keeps peer access read-only and internal notes private", () => {
    expect(migration).toContain('CREATE POLICY "Department tickets read"');
    expect(migration).toContain('CREATE POLICY "Authors insert public comments"');
    expect(migration).toContain("t.author_id = auth.uid()");
    expect(migration).toContain("NOT comments.is_internal_note");
  });

  it("restricts department maintenance to super admins", () => {
    expect(migration).toContain('CREATE POLICY "Super admins manage departments"');
    expect(migration).toContain("public.current_user_role() = 'super_admin'");
  });
});

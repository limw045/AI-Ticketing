import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260812010000_department_scoped_ticket_access.sql", import.meta.url),
  "utf8"
);
const route = readFileSync(
  new URL("../app/api/attachments/[...path]/route.ts", import.meta.url),
  "utf8"
);

describe("ticket attachment authorization", () => {
  it("stores attachment ownership and optional ticket binding", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.ticket_attachments");
    expect(migration).toContain("ticket_id UUID REFERENCES public.tickets");
    expect(migration).toContain("storage_path TEXT UNIQUE NOT NULL");
  });

  it("authorizes bound downloads through visible active tickets", () => {
    expect(route).toContain('from("ticket_attachments")');
    expect(route).toContain('from("tickets")');
    expect(route).toContain('.is("deleted_at", null)');
    expect(route).toContain("Attachment access denied");
  });
});

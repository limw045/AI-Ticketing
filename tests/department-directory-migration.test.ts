import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260812010000_department_scoped_ticket_access.sql", import.meta.url),
  "utf8"
);
const directory = readFileSync(
  new URL("../supabase/schema/department_directory.sql", import.meta.url),
  "utf8"
);

describe("department scoped ticket migration", () => {
  it("creates controlled departments and stable profile/ticket references", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.departments");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS department_id UUID");
    expect(migration).toContain("System Integrations");
    expect(migration).toContain("AI & Automation Transformation");
  });

  it("maps legacy AI and General values into AI&A", () => {
    expect(migration).toMatch(/AI Department[\s\S]*General[\s\S]*AI & Automation Transformation/);
    expect(migration).toContain("SET department_id =");
  });

  it("snapshots ticket departments and defaults unmatched API tickets", () => {
    expect(migration).toContain("set_ticket_department_snapshot");
    expect(migration).toContain("system-integrations");
    expect(migration).toContain("BEFORE INSERT ON public.tickets");
  });

  it("replaces the legacy initial department with active General", () => {
    expect(directory).toMatch(/'General','general',true,false/);
    expect(directory).toMatch(/UPDATE gtjbticketing\.profiles[\s\S]*slug='general'/);
    expect(directory).toMatch(/UPDATE gtjbticketing\.tickets[\s\S]*slug='general'/);
    expect(directory).toMatch(/DELETE FROM gtjbticketing\.departments[\s\S]*slug='initial-department'/);
    expect(directory).not.toMatch(/SET is_active=false WHERE slug='initial-department'/);
  });
});

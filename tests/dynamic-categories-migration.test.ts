import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../supabase/migrations/20260811010000_dynamic_categories_and_log_attachments.sql",
  import.meta.url
);

describe("dynamic categories and log attachments migration", () => {
  it("seeds the two initial active category rules without rewriting tickets", () => {
    const migration = readFileSync(migrationPath, "utf8");
    expect(migration).toContain("'Risk Screen'");
    expect(migration).toContain("'Common Problem'");
    expect(migration).toContain("ON CONFLICT (category_name) DO UPDATE");
    expect(migration).toContain("category_name NOT IN ('Risk Screen', 'Common Problem')");
    expect(migration).not.toMatch(/UPDATE\s+public\.tickets\s+SET\s+category/i);
  });

  it("protects the final active category and permits plain-text storage", () => {
    const migration = readFileSync(migrationPath, "utf8");
    expect(migration).toContain("protect_last_active_category");
    expect(migration).toContain("The final active ticket category cannot be deleted");
    expect(migration).toContain("'text/plain'");
  });

  it("validates API ticket creation against active category rules", () => {
    const migration = readFileSync(migrationPath, "utf8");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.ingest_ticket");
    expect(migration).toContain("resolved_category");
    expect(migration).toContain("deleted_at IS NULL");
    expect(migration).toContain("Ticket category is not active");
    expect(migration).toContain("validate_new_ticket_category");
    expect(migration).toContain("default_assignee_id INTO category_assignee");
    expect(migration).toContain("ORDER BY CASE WHEN category_name = 'Risk Screen' THEN 0 ELSE 1 END");
  });
});

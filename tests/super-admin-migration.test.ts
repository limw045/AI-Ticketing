import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../supabase/migrations/20260810010000_super_admin_full_crud.sql", import.meta.url),
  "utf8"
);

describe("Super Admin migration contract", () => {
  it("migrates the legacy role and protects the reserved bootstrap account", () => {
    expect(migration).toContain("UPDATE public.profiles SET role = 'admin' WHERE role = 'support_agent'");
    expect(migration).toContain("lower(email) = 'lim.weijian@outlook.com'");
    expect(migration).toContain("CHECK (role IN ('employee', 'admin', 'super_admin'))");
  });

  it("keeps system logs immutable and business deletes recoverable", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.admin_activity_logs");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.set_admin_record_deleted");
    expect(migration).not.toContain('ON public.admin_activity_logs FOR UPDATE');
    expect(migration).not.toContain('ON public.admin_activity_logs FOR DELETE');
  });

  it("guards self-management and the final active Super Admin", () => {
    expect(migration).toContain("You cannot change your own access or account lifecycle");
    expect(migration).toContain("The final active Super Admin cannot be demoted, suspended, or deleted");
  });
});

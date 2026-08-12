"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/Alert";
import { Button, FieldLabel, Input } from "@/components/ui/FormField";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Department = { id: string; name: string; slug: string; is_active: boolean; is_system: boolean };

const toSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const { data, error: loadError } = await createClient().from("departments").select("id, name, slug, is_active, is_system").order("name");
    if (loadError) setError(loadError.message);
    else setDepartments((data ?? []) as Department[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const addDepartment = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = name.trim();
    if (!normalized) return;
    setError(""); setNotice("");
    const { error: insertError } = await createClient().from("departments").insert({ name: normalized, slug: toSlug(normalized) });
    if (insertError) setError(insertError.message);
    else { setName(""); setNotice("Department added."); await load(); }
  };

  const toggleDepartment = async (department: Department) => {
    setError(""); setNotice("");
    const { error: updateError } = await createClient().from("departments").update({ is_active: !department.is_active }).eq("id", department.id).eq("is_system", false);
    if (updateError) setError(updateError.message);
    else { setNotice(department.is_active ? "Department deactivated." : "Department restored."); await load(); }
  };

  return <section className="space-y-5">
    <div>
      <h2 className="font-display text-xl font-bold">Department directory</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">These choices control registration, staff profiles, and department request visibility.</p>
    </div>
    {error && <Alert tone="error">{error}</Alert>}
    {notice && <Alert tone="success">{notice}</Alert>}
    <form onSubmit={addDepartment} className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
      <label className="flex-1"><FieldLabel>New department</FieldLabel><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Department name" required /></label>
      <Button type="submit">Add department</Button>
    </form>
    <div className="surface divide-y divide-[var(--line)] overflow-hidden">
      {departments.map((department) => <div key={department.id} className="flex items-center justify-between gap-4 p-4">
        <div><p className="text-sm font-semibold">{department.name}</p><p className="font-mono text-[10px] text-[var(--faint)]">{department.slug}</p></div>
        <div className="flex items-center gap-3"><StatusBadge tone={department.is_active ? "success" : "neutral"}>{department.is_active ? "Active" : "Inactive"}</StatusBadge>{department.is_system ? <StatusBadge tone="neutral">System</StatusBadge> : <Button type="button" variant="secondary" className="!min-h-9 !px-3 !py-1.5 !text-xs" onClick={() => void toggleDepartment(department)}>{department.is_active ? "Deactivate" : "Restore"}</Button>}</div>
      </div>)}
    </div>
  </section>;
}

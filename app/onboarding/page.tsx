"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/public/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button, FieldLabel, Input, Select } from "@/components/ui/FormField";
import { safeInternalNext } from "@/lib/auth-redirect";

type Department = { id: string; name: string };

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [userType, setUserType] = useState("full_time");
  const [supervisor, setSupervisor] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { router.replace("/login"); return; }
      const { data, error: loadError } = await supabase.from("departments")
        .select("id, name").eq("is_active", true).eq("is_system", false).order("name");
      if (cancelled) return;
      setEmail(user.email ?? "");
      setName(user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? "");
      if (loadError) setError("Departments could not be loaded. Please try again.");
      else {
        setDepartments(data ?? []);
        const registeredDepartment = user.user_metadata?.department_id;
        setDepartmentId(data?.some(d => d.id === registeredDepartment) ? registeredDepartment : "");
      }
      setLoading(false);
    }
    void load().catch(() => { if (!cancelled) { setError("Unable to load your profile setup. Please reload."); setLoading(false); } });
    return () => { cancelled = true; };
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const { data, error: saveError } = await createClient().rpc("complete_ticketing_profile", {
        p_display_name: name.trim(), p_department_id: departmentId || null,
        p_user_type: userType, p_supervisor_name: supervisor.trim() || null,
        p_initial_department_name: null,
      });
      if (saveError) throw saveError;
      if (data?.account_status !== "active" || data?.deleted_at) throw new Error("Your Ticketing access is inactive. Please contact an administrator.");
      const next = safeInternalNext(new URLSearchParams(window.location.search).get("next"));
      router.replace(next); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profile setup failed. Please try again.");
    } finally { setSaving(false); }
  }

  return <AuthShell illustration="complete" backHref="/">
    <h1 className="font-display text-2xl font-bold">Complete your Ticketing profile</h1>
    <p className="mt-2 text-sm text-[var(--muted)]">Signed in as {email || "your existing account"}. Add your work details to use the support desk.</p>
    {error && <div className="mt-5"><Alert tone="error" role="alert">{error}</Alert></div>}
    {!loading && !departments.length && <div className="mt-5"><Alert tone="info">An administrator needs to configure departments before you can join the support desk.</Alert></div>}
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="block"><FieldLabel>Full name</FieldLabel><Input value={name} onChange={e => setName(e.target.value)} required maxLength={120} /></label>
      <label className="block"><FieldLabel>Department</FieldLabel><Select value={departmentId} onChange={e => setDepartmentId(e.target.value)} required disabled={loading || !departments.length}><option value="" disabled>Select your department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></label>
      <label className="block"><FieldLabel>Account type</FieldLabel><Select value={userType} onChange={e => setUserType(e.target.value)}><option value="full_time">Staff</option><option value="intern">Intern</option><option value="contractor">Contractor</option></Select></label>
      {userType === "intern" && <label className="block"><FieldLabel>Supervisor</FieldLabel><Input value={supervisor} onChange={e => setSupervisor(e.target.value)} required maxLength={120} /></label>}
      <Button type="submit" disabled={loading || saving || !departmentId}>{saving ? "Saving…" : "Continue to Ticketing"}</Button>
    </form>
  </AuthShell>;
}

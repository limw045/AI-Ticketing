"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Infinity, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditorialGrid } from "@/components/EditorialGrid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters for the new password.");
      return;
    }
    if (password !== confirmation) {
      setError("The password confirmation does not match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("This recovery session is missing or expired. Request a new reset link.");
      setLoading(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess("Password updated. Redirecting to your ticket queue...");
    setTimeout(() => router.replace("/tickets"), 1000);
  };

  return (
    <main className="editorial-shell flex min-h-screen items-center justify-center px-6 py-12">
      <EditorialGrid />
      <section className="editorial-content w-full max-w-md border border-white/10 bg-[#111113] p-8 shadow-2xl">
        <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><Infinity className="h-5 w-5" /> Get Blue</div>
          <span className="editorial-mono text-[10px] uppercase tracking-widest text-zinc-500">Recovery / 02</span>
        </div>
        <h1 className="text-3xl font-light tracking-[-0.04em] text-white">Set a new password.</h1>
        {error && <div role="alert" className="mt-6 flex gap-2 border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200"><AlertCircle className="h-4 w-4" />{error}</div>}
        {success && <div role="status" className="mt-6 flex gap-2 border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4" />{success}</div>}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {[{ label: "New password", value: password, set: setPassword }, { label: "Confirm password", value: confirmation, set: setConfirmation }].map((field) => (
            <label key={field.label} className="block"><span className="editorial-mono mb-2 block text-[10px] uppercase tracking-widest text-zinc-500">{field.label}</span><span className="relative block"><KeyRound className="absolute left-3 top-3 h-4 w-4 text-zinc-600" /><input required minLength={8} type="password" value={field.value} onChange={(event) => field.set(event.target.value)} className="w-full border border-white/10 bg-[#0a0a0c] px-10 py-3 text-xs text-white outline-none focus:border-[#6a9bcc]" /></span></label>
          ))}
          <button disabled={loading || Boolean(success)} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#6a9bcc] px-5 py-3 text-xs font-bold text-zinc-950 disabled:opacity-50">{loading ? "Updating..." : "Update password"}<ArrowRight className="h-4 w-4" /></button>
        </form>
      </section>
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, AlertCircle, CheckCircle2, Infinity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditorialGrid } from "@/components/EditorialGrid";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` }
    );
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSuccess("If the account exists, a password reset link has been sent.");
  };

  return (
    <main className="editorial-shell flex min-h-screen items-center justify-center px-6 py-12">
      <EditorialGrid />
      <section className="editorial-content w-full max-w-md border border-white/10 bg-[#111113] p-8 shadow-2xl">
        <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><Infinity className="h-5 w-5" /> Get Blue</div>
          <span className="editorial-mono text-[10px] uppercase tracking-widest text-zinc-500">Recovery / 01</span>
        </div>
        <h1 className="text-3xl font-light tracking-[-0.04em] text-white">Recover your access.</h1>
        <p className="mt-2 text-xs leading-5 text-zinc-500">We will send a secure reset link to your registered staff or Intern email.</p>
        {error && <div role="alert" className="mt-6 flex gap-2 border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200"><AlertCircle className="h-4 w-4" />{error}</div>}
        {success && <div role="status" className="mt-6 flex gap-2 border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4" />{success}</div>}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="editorial-mono mb-2 block text-[10px] uppercase tracking-widest text-zinc-500">Email address</span>
            <span className="relative block"><Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-600" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full border border-white/10 bg-[#0a0a0c] px-10 py-3 text-xs text-white outline-none focus:border-[#6a9bcc]" /></span>
          </label>
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#6a9bcc] px-5 py-3 text-xs font-bold text-zinc-950 disabled:opacity-50">{loading ? "Sending..." : "Send reset link"}<ArrowRight className="h-4 w-4" /></button>
        </form>
        <p className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-zinc-600"><Link href="/login" className="text-[#8db3d6] hover:text-white">Back to sign in</Link></p>
      </section>
    </main>
  );
}

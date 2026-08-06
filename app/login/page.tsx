"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, ArrowRight, KeyRound, Mail, Infinity } from "lucide-react";
import { EditorialGrid } from "@/components/EditorialGrid";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await createClient().auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    window.location.href = "/tickets";
  };

  return (
    <main className="editorial-shell flex min-h-screen items-center justify-center px-6 py-12">
      <EditorialGrid />
      <div className="editorial-content grid w-full max-w-6xl grid-cols-1 gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="hidden lg:block">
          <div className="mb-6 flex items-center gap-3 text-xs editorial-mono text-zinc-500">
            <span className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white">AI DESK</span>
            <span>GTMSW / 2026</span>
          </div>
          <h1 className="max-w-2xl text-6xl font-light leading-[0.98] tracking-[-0.06em] text-white">
            A clear route from request to resolution.
          </h1>
          <p className="mt-8 max-w-lg text-sm leading-7 text-zinc-500">
            The AI Department support desk for model access, data pipelines, GPU resources, and production issues.
          </p>
          <div className="editorial-bubble mt-14 max-w-sm p-5">
            <div className="mb-3 flex items-center gap-2 text-[11px] editorial-mono text-zinc-500">
              <Infinity className="h-4 w-4 text-white" />
              <span>AI DESK / LIVE</span>
              <span className="ml-auto">STEP 01</span>
            </div>
            <p className="text-sm leading-6 text-zinc-300">Tell us what is blocked. We will route it to the right specialist with the context they need.</p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md border border-white/10 bg-[#111113] p-8 shadow-2xl">
          <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Infinity className="h-5 w-5" /> Get Blue
            </div>
            <span className="editorial-mono text-[10px] uppercase tracking-widest text-zinc-500">01 / Sign In</span>
          </div>

          <h2 className="text-3xl font-light tracking-[-0.04em] text-white">Welcome back.</h2>
          <p className="mt-2 text-xs leading-5 text-zinc-500">Sign in with your GTMSW staff or Intern account.</p>

          {error && (
            <div className="mt-6 flex items-center gap-2 border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <label className="block">
              <span className="editorial-mono mb-2 block text-[10px] uppercase tracking-widest text-zinc-500">Email address</span>
              <span className="relative block">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-600" />
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="name@gtmsw.com.my" className="w-full border border-white/10 bg-[#0a0a0c] px-10 py-3 text-xs text-white outline-none transition placeholder:text-zinc-700 focus:border-[#6a9bcc]" />
              </span>
            </label>
            <label className="block">
              <span className="editorial-mono mb-2 block text-[10px] uppercase tracking-widest text-zinc-500">Password</span>
              <span className="relative block">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-zinc-600" />
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required placeholder="••••••••" className="w-full border border-white/10 bg-[#0a0a0c] px-10 py-3 text-xs text-white outline-none transition placeholder:text-zinc-700 focus:border-[#6a9bcc]" />
              </span>
            </label>
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#6a9bcc] px-5 py-3 text-xs font-bold text-zinc-950 transition hover:bg-[#84add1] disabled:opacity-50">
              {loading ? "Signing in..." : "Sign in to AI desk"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-zinc-600">
            New to the desk? <Link href="/register" className="text-[#8db3d6] hover:text-white">Create an account</Link>
          </p>
        </section>
      </div>
    </main>
  );
}

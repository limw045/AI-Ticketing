"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { KeyRound, Mail, AlertCircle, ArrowRight, Cpu } from "lucide-react";
import { DotGridBg } from "@/components/react-bits/DotGridBg";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      window.location.href = "/tickets";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc] text-zinc-950 p-4 relative overflow-hidden">
      <DotGridBg />

      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-black/5 space-y-6 relative z-10">
        <div className="flex justify-between items-center border-b border-black/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-white text-xs font-bold">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-zinc-900 tracking-tight">GTMSW AI Dept</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest bg-zinc-50 border border-black/5 px-2 py-0.5 rounded">
            Sign In
          </span>
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950">Welcome Back</h1>
          <p className="text-xs text-zinc-500 mt-1">Sign in with your GTMSW Staff or Intern account</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
              <input
                type="email"
                placeholder="user@gtmsw.com.my or user@outlook.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50/50 border border-black/10 text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition placeholder:text-zinc-400 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50/50 border border-black/10 text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition placeholder:text-zinc-400 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? "Signing in..." : "Sign In to Portal"}
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        <div className="text-center text-xs text-zinc-400 pt-2 border-t border-black/5">
          Don't have an account?{" "}
          <Link href="/register" className="text-blue-600 hover:underline font-semibold">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

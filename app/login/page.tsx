"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { KeyRound, Mail, AlertCircle, ArrowRight, Sparkles } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/70 via-slate-50 to-indigo-50/50 text-slate-800 p-4 relative overflow-hidden">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-slate-200/80 space-y-6 relative z-10">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> GTMSW Support
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in with your GTMSW staff or Intern account</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                placeholder="user@gtmsw.com.my or user@outlook.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {loading ? "Signing in..." : "Sign In to Portal"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Don't have an account?{" "}
          <Link href="/register" className="text-blue-600 hover:underline font-bold">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

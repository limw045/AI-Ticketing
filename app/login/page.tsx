"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  KeyRound,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Loader2,
} from "lucide-react";
import { BlurText } from "@/components/react-bits/BlurText";
import { ShinyText } from "@/components/react-bits/ShinyText";
import { SpotlightCard } from "@/components/react-bits/SpotlightCard";
import { GlassSurface } from "@/components/react-bits/GlassSurface";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const isStaff = normalizedEmail.endsWith("@gtmsw.com.my");
  const isIntern = normalizedEmail.endsWith("@outlook.com");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Ambient background glow mesh */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" style={{ animationDelay: "3s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Main Split Grid Container */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* LEFT COLUMN: Brand & Showcase */}
        <div className="lg:col-span-6 space-y-8 pr-0 lg:pr-4">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-medium text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>GTMSW Staff & Intern Gateway</span>
              <span className="text-zinc-600">•</span>
              <ShinyText text="v2.0 Portal" className="font-semibold text-blue-400" />
            </div>

            <div className="space-y-2">
              <BlurText
                text="Internal Support & Ticketing Hub"
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-tight"
                animateBy="words"
                delay={0.06}
              />
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-lg">
                Streamlined issue tracking and communication platform built exclusively for GTMSW employees and interns.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-blue-950/40 border border-blue-800/40 text-blue-300 text-xs font-mono">
                @gtmsw.com.my (Staff)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs font-mono">
                @outlook.com (Interns)
              </span>
            </div>
          </div>

          {/* Feature Showcase Spotlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.2)" className="p-4 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Ticket className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-zinc-200">Fast Ticketing</h3>
              <p className="text-[11px] text-zinc-400 leading-tight">Submit & monitor IT, HR, and Operations requests instantly.</p>
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(168, 85, 247, 0.2)" className="p-4 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-zinc-200">AI Assistance</h3>
              <p className="text-[11px] text-zinc-400 leading-tight">Automated ticket summaries and smart reply suggestions.</p>
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.2)" className="p-4 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-zinc-200">SLA Guarantees</h3>
              <p className="text-[11px] text-zinc-400 leading-tight">Guaranteed priority queues and supervisor sync for interns.</p>
            </SpotlightCard>
          </div>
        </div>

        {/* RIGHT COLUMN: Auth Form Glass Box */}
        <div className="lg:col-span-6 flex justify-center">
          <GlassSurface showWindowDots title="Authentication" className="w-full max-w-md">
            <div className="space-y-6">
              
              {/* Form Title */}
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center justify-between">
                  Welcome Back
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                </h2>
                <p className="text-xs text-zinc-400 mt-1">Sign in to access your ticketing dashboard</p>
              </div>

              {/* Dynamic Error Banner */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 text-red-300 text-xs flex items-center gap-2.5 shadow-lg animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form Input Fields */}
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Email Field */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-zinc-300">Work Email</label>
                    {normalizedEmail && (
                      <span className="text-[11px] font-medium transition">
                        {isStaff && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Staff Verified</span>}
                        {isIntern && <span className="text-amber-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Intern Verified</span>}
                      </span>
                    )}
                  </div>
                  
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
                    <input
                      type="email"
                      placeholder="user@gtmsw.com.my or user@outlook.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-zinc-100 placeholder:text-zinc-600 shadow-inner"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-zinc-300">Password</label>
                  </div>

                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-zinc-100 placeholder:text-zinc-600 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Options Row */}
                <div className="flex items-center justify-between text-xs text-zinc-400 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-zinc-300 transition">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-950"
                    />
                    <span>Remember account</span>
                  </label>
                  <a href="#" onClick={(e) => { e.preventDefault(); alert("Please contact IT Admin to reset your password."); }} className="text-zinc-400 hover:text-blue-400 transition">
                    Forgot password?
                  </a>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-50 text-white font-semibold text-sm transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Switch to Register Link */}
              <div className="text-center text-xs text-zinc-400 pt-3 border-t border-zinc-800/80">
                Don't have an account yet?{" "}
                <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold hover:underline transition">
                  Register account
                </Link>
              </div>

            </div>
          </GlassSurface>
        </div>

      </div>
    </div>
  );
}

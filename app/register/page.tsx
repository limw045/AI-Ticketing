"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  User,
  Mail,
  KeyRound,
  Building2,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Briefcase,
  Users,
  Loader2,
} from "lucide-react";
import { BlurText } from "@/components/react-bits/BlurText";
import { ShinyText } from "@/components/react-bits/ShinyText";
import { SpotlightCard } from "@/components/react-bits/SpotlightCard";
import { GlassSurface } from "@/components/react-bits/GlassSurface";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [department, setDepartment] = useState("IT");
  const [supervisor, setSupervisor] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const isStaff = normalizedEmail.endsWith("@gtmsw.com.my");
  const isIntern = normalizedEmail.endsWith("@outlook.com");
  const isValidDomain = isStaff || isIntern;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidDomain) {
      setError("Registration rejected. Allowed domains: @gtmsw.com.my (Staff) and @outlook.com (Interns).");
      return;
    }

    if (isIntern && !supervisor.trim()) {
      setError("Interns must specify a Supervisor Name.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const userType = isIntern ? "intern" : "full_time";

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          display_name: displayName,
          user_type: userType,
          department,
          supervisor_name: isIntern ? supervisor : null,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: authData.user.id,
        email: normalizedEmail,
        display_name: displayName,
        user_type: userType,
        department,
        supervisor_name: isIntern ? supervisor : null,
        role: "employee",
      });

      if (profileError) {
        console.error("Profile upsert error:", profileError);
      }
    }

    window.location.href = "/tickets";
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Ambient background glow mesh */}
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/3 -left-32 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" style={{ animationDelay: "3s" }} />

      {/* Main Split Grid Container */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* LEFT COLUMN: Registration Info Showcase */}
        <div className="lg:col-span-5 space-y-8 pr-0 lg:pr-4">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-medium text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Account Onboarding</span>
              <span className="text-zinc-600">•</span>
              <ShinyText text="Instant Verification" className="font-semibold text-blue-400" />
            </div>

            <div className="space-y-2">
              <BlurText
                text="Join the GTMSW Platform"
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-tight"
                animateBy="words"
                delay={0.06}
              />
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
                Create your official account to submit support tickets, sync with your department supervisor, and receive real-time updates.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <SpotlightCard spotlightColor="rgba(59, 130, 246, 0.15)" className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-200">Full-Time Staff (@gtmsw.com.my)</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Access full ticketing privileges, department routing, and admin dashboards.</p>
              </div>
            </SpotlightCard>

            <SpotlightCard spotlightColor="rgba(245, 158, 11, 0.15)" className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-200">Intern Accounts (@outlook.com)</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Includes automatic supervisor linking for ticket oversight and approvals.</p>
              </div>
            </SpotlightCard>
          </div>
        </div>

        {/* RIGHT COLUMN: Registration Form */}
        <div className="lg:col-span-7 flex justify-center">
          <GlassSurface showWindowDots title="Account Registration" className="w-full max-w-lg">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Create Account</h2>
                <p className="text-xs text-zinc-400 mt-1">Fill in your information to register</p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 text-red-300 text-xs flex items-center gap-2.5 shadow-lg">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="e.g. Alex Tan"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-zinc-100 placeholder:text-zinc-600 shadow-inner"
                    />
                  </div>
                </div>

                {/* Company Email */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-zinc-300">Company Email</label>
                    {normalizedEmail && (
                      <span className="text-[11px] font-medium">
                        {isStaff && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Full-time Staff Recognized</span>}
                        {isIntern && <span className="text-amber-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Intern Recognized</span>}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
                    <input
                      type="email"
                      placeholder="staff@gtmsw.com.my or intern@outlook.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-zinc-100 placeholder:text-zinc-600 shadow-inner"
                    />
                  </div>
                </div>

                {/* Supervisor Field (Required for Interns) */}
                {isIntern && (
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 space-y-2 animate-in fade-in">
                    <label className="text-xs font-semibold text-amber-300 block">Supervisor Name (Required for Interns)</label>
                    <div className="relative">
                      <UserCheck className="w-4 h-4 absolute left-3 top-3 text-amber-500" />
                      <input
                        type="text"
                        placeholder="e.g. Supervisor Li"
                        value={supervisor}
                        onChange={(e) => setSupervisor(e.target.value)}
                        required={isIntern}
                        className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-950/90 border border-amber-600/50 text-sm text-amber-200 focus:outline-none focus:border-amber-400 transition placeholder:text-amber-700"
                      />
                    </div>
                  </div>
                )}

                {/* Department Selection */}
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1.5">Department</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500 pointer-events-none" />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800/90 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-zinc-100"
                    >
                      <option value="IT">IT Support & System</option>
                      <option value="HR">Human Resources</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Finance">Finance & Accounting</option>
                      <option value="Product">Product & Engineering</option>
                    </select>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1.5">Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
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

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading || !isValidDomain}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-semibold text-sm transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 mt-3"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center text-xs text-zinc-400 pt-3 border-t border-zinc-800/80">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold hover:underline transition">
                  Sign In here
                </Link>
              </div>
            </div>
          </GlassSurface>
        </div>

      </div>
    </div>
  );
}

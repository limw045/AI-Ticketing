"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { User, Mail, KeyRound, Building2, UserCheck, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      await supabase.from("profiles").upsert({
        id: authData.user.id,
        email: normalizedEmail,
        display_name: displayName,
        user_type: userType,
        department,
        supervisor_name: isIntern ? supervisor : null,
        role: "employee",
      });
    }

    window.location.href = "/tickets";
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
            <Sparkles className="w-3.5 h-3.5" /> Join Portal
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Account</h1>
          <p className="text-sm text-slate-500 mt-1">Full-time Staff and Intern registration</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Zhang San"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5 uppercase tracking-wider">Company Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                placeholder="staff@gtmsw.com.my or intern@outlook.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400 font-medium"
              />
            </div>
            {normalizedEmail && (
              <div className="mt-1.5 text-xs flex items-center gap-1.5 font-medium">
                {isStaff && (
                  <span className="text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Full-time Staff Recognized (@gtmsw.com.my)
                  </span>
                )}
                {isIntern && (
                  <span className="text-amber-800 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> Intern Account Recognized (@outlook.com)
                  </span>
                )}
                {!isValidDomain && (
                  <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Domain unverified. Must use @gtmsw.com.my or @outlook.com
                  </span>
                )}
              </div>
            )}
          </div>

          {isIntern && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
              <label className="text-xs font-bold text-amber-800 block uppercase tracking-wider">
                Supervisor Name (Required for Interns)
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 absolute left-3.5 top-3 text-amber-600" />
                <input
                  type="text"
                  placeholder="e.g. Supervisor Li"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  required={isIntern}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-amber-300 text-sm text-amber-900 focus:outline-none focus:border-amber-500 transition placeholder:text-amber-700 font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5 uppercase tracking-wider">Department</label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition text-slate-800 font-medium"
              >
                <option value="IT">IT Support & System</option>
                <option value="HR">Human Resources</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance & Accounting</option>
                <option value="Product">Product & Engineering</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isValidDomain}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-sm transition shadow-lg shadow-blue-500/20"
          >
            {loading ? "Creating Account..." : "Complete Registration"}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline font-bold">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { User, Mail, KeyRound, Building2, UserCheck, AlertCircle, CheckCircle2, Cpu } from "lucide-react";
import { DotGridBg } from "@/components/react-bits/DotGridBg";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("AI Department");
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
            Register
          </span>
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950">Create Account</h1>
          <p className="text-xs text-zinc-500 mt-1">Full-time Staff and Intern registration for AI Support</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Zhang San"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50/50 border border-black/10 text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition placeholder:text-zinc-400 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Company Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
              <input
                type="email"
                placeholder="staff@gtmsw.com.my or intern@outlook.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50/50 border border-black/10 text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition placeholder:text-zinc-400 font-medium"
              />
            </div>
            {normalizedEmail && (
              <div className="mt-1.5 text-xs flex items-center gap-1.5 font-medium">
                {isStaff && (
                  <span className="text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Staff Recognized (@gtmsw.com.my)
                  </span>
                )}
                {isIntern && (
                  <span className="text-amber-800 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> Intern Recognized (@outlook.com)
                  </span>
                )}
                {!isValidDomain && (
                  <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    Domain unverified. Must use @gtmsw.com.my or @outlook.com
                  </span>
                )}
              </div>
            )}
          </div>

          {isIntern && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <label className="text-[11px] font-semibold text-amber-800 block uppercase tracking-wider">
                Supervisor Name (Required for Interns)
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 absolute left-3.5 top-2.5 text-amber-600" />
                <input
                  type="text"
                  placeholder="e.g. Supervisor Li"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  required={isIntern}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white border border-amber-300 text-xs text-amber-900 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Department</label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50/50 border border-black/10 text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition text-zinc-800 font-medium"
              >
                <option value="AI Department">AI Department User</option>
                <option value="IT">IT Support & System</option>
                <option value="HR">Human Resources</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance & Accounting</option>
                <option value="Product">Product & Engineering</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
              <input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50/50 border border-black/10 text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition placeholder:text-zinc-400 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isValidDomain}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-xs transition shadow-sm"
          >
            {loading ? "Creating Account..." : "Complete Registration"}
          </button>
        </form>

        <div className="text-center text-xs text-zinc-400 pt-2 border-t border-black/5">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline font-semibold">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}

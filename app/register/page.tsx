"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, ArrowRight, Building2, CheckCircle2, KeyRound, Mail, User, UserCheck, Infinity } from "lucide-react";
import { EditorialGrid } from "@/components/EditorialGrid";
import { classifyAccountEmail, isReservedAdminEmail, validateRegistration } from "@/lib/auth-policy";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("AI Department");
  const [supervisor, setSupervisor] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const accountType = classifyAccountEmail(normalizedEmail);
  const isAdminEmail = isReservedAdminEmail(normalizedEmail);
  const isStaff = accountType === "full_time";
  const isIntern = accountType === "intern";
  const isValidDomain = isStaff || isIntern;

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const validation = validateRegistration({ email: normalizedEmail, displayName, department, supervisor });
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    const userType = validation.accountType;
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/login?verified=1`,
        data: {
          display_name: displayName.trim(),
          user_type: userType,
          department,
          supervisor_name: isIntern ? supervisor.trim() : null,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      router.replace("/tickets");
      router.refresh();
      return;
    }
    router.replace("/verify-email");
  };

  return (
    <main className="editorial-shell flex min-h-screen items-center justify-center px-6 py-10">
      <EditorialGrid />
      <div className="editorial-content grid w-full max-w-6xl grid-cols-1 gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <section className="hidden lg:block">
          <div className="editorial-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">STEP 02 / ACCESS</div>
          <h1 className="mt-6 max-w-md text-6xl font-light leading-[0.94] tracking-[-0.06em] text-white">Make the next request easier.</h1>
          <p className="mt-8 max-w-sm text-sm leading-7 text-zinc-500">Create an account once. Every future request carries your department context and routes cleanly to the AI team.</p>
        </section>

        <section className="mx-auto w-full max-w-xl border border-white/10 bg-[#111113] p-8 shadow-2xl">
          <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Infinity className="h-5 w-5" /> Get Blue</div>
            <span className="editorial-mono text-[10px] uppercase tracking-widest text-zinc-500">02 / Register</span>
          </div>
          <h2 className="text-3xl font-light tracking-[-0.04em] text-white">Create your access.</h2>
          <p className="mt-2 text-xs leading-5 text-zinc-500">Use a GTMSW staff address or your Intern Outlook account.</p>

          {error && <div className="mt-6 flex items-center gap-2 border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200" role="alert"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

          <form onSubmit={handleRegister} className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block md:col-span-2"><span className="editorial-mono mb-2 block text-[10px] uppercase tracking-widest text-zinc-500">Full name</span><span className="relative block"><User className="absolute left-3 top-3 h-4 w-4 text-zinc-600" /><input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Zhang San" className="w-full border border-white/10 bg-[#0a0a0c] px-10 py-3 text-xs text-white outline-none focus:border-[#6a9bcc]" /></span></label>
            <label className="block md:col-span-2"><span className="editorial-mono mb-2 block text-[10px] uppercase tracking-widest text-zinc-500">Email address</span><span className="relative block"><Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-600" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@gtmsw.com.my" className="w-full border border-white/10 bg-[#0a0a0c] px-10 py-3 text-xs text-white outline-none focus:border-[#6a9bcc]" /></span></label>
            {normalizedEmail && <div className="md:col-span-2 text-[11px] editorial-mono">{isAdminEmail && <span className="text-[#8db3d6]"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />ADMIN EMAIL RECOGNIZED</span>}{isStaff && !isAdminEmail && <span className="text-[#a4b889]"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />STAFF DOMAIN RECOGNIZED</span>}{isIntern && <span className="text-[#e0a58b]"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />INTERN DOMAIN RECOGNIZED</span>}{!isValidDomain && <span className="text-rose-300">DOMAIN NOT ALLOWED</span>}</div>}
            {isIntern && <label className="block md:col-span-2"><span className="editorial-mono mb-2 block text-[10px] uppercase tracking-widest text-[#e0a58b]">Supervisor / mentor</span><span className="relative block"><UserCheck className="absolute left-3 top-3 h-4 w-4 text-[#e0a58b]" /><input required value={supervisor} onChange={(event) => setSupervisor(event.target.value)} placeholder="Supervisor name" className="w-full border border-[#d97757]/30 bg-[#1a1414] px-10 py-3 text-xs text-white outline-none focus:border-[#d97757]" /></span></label>}
            <label className="block"><span className="editorial-mono mb-2 block text-[10px] uppercase tracking-widest text-zinc-500">Department</span><span className="relative block"><Building2 className="absolute left-3 top-3 h-4 w-4 text-zinc-600" /><select value={department} onChange={(event) => setDepartment(event.target.value)} className="w-full appearance-none border border-white/10 bg-[#0a0a0c] px-10 py-3 text-xs text-white outline-none focus:border-[#6a9bcc]"><option>AI Department</option><option>IT</option><option>HR</option><option>Marketing</option><option>Finance</option><option>Product</option></select></span></label>
            <label className="block"><span className="editorial-mono mb-2 block text-[10px] uppercase tracking-widest text-zinc-500">Password</span><span className="relative block"><KeyRound className="absolute left-3 top-3 h-4 w-4 text-zinc-600" /><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="w-full border border-white/10 bg-[#0a0a0c] px-10 py-3 text-xs text-white outline-none focus:border-[#6a9bcc]" /></span></label>
            <button disabled={loading || !isValidDomain} className="md:col-span-2 flex items-center justify-center gap-2 rounded-full bg-[#6a9bcc] px-5 py-3 text-xs font-bold text-zinc-950 transition hover:bg-[#84add1] disabled:opacity-50">{loading ? "Creating access..." : "Create AI desk account"}<ArrowRight className="h-4 w-4" /></button>
          </form>
          <p className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-zinc-600">Already have access? <Link href="/login" className="text-[#8db3d6] hover:text-white">Sign in</Link></p>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/public/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button, FieldLabel, Input, Select } from "@/components/ui/FormField";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  KeyRound,
  Mail,
  User,
  UserCheck,
} from "lucide-react";
import {
  classifyAccountEmail,
  isReservedAdminEmail,
  validateRegistration,
} from "@/lib/auth-policy";

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
    const validation = validateRegistration({
      email: normalizedEmail,
      displayName,
      department,
      supervisor,
    });
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
      router.replace("/dashboard");
      router.refresh();
      return;
    }
    router.replace("/verify-email");
  };

  return (
    <AuthShell step="02 / Register" backHref="/login">
      <h1 className="font-display text-2xl font-bold tracking-[-0.03em]">
        Create your access.
      </h1>
      <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
        Use a GTMSW staff address or your Intern Outlook account.
      </p>

      {error && (
        <div className="mt-6">
          <Alert tone="error" role="alert">
            {error}
          </Alert>
        </div>
      )}

      <form
        onSubmit={handleRegister}
        className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2"
      >
        <label className="block md:col-span-2">
          <FieldLabel>Full name</FieldLabel>
          <span className="relative block">
            <User className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--faint)]" />
            <Input
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Zhang San"
              className="pl-10"
            />
          </span>
        </label>

        <label className="block md:col-span-2">
          <FieldLabel>Email address</FieldLabel>
          <span className="relative block">
            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--faint)]" />
            <Input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@gtmsw.com.my"
              className="pl-10"
            />
          </span>
        </label>

        {normalizedEmail && (
          <div className="font-mono text-[11px] font-semibold md:col-span-2">
            {isAdminEmail && (
              <span className="inline-flex items-center gap-1.5 text-[var(--brand-ink)]">
                <CheckCircle2 className="h-3.5 w-3.5" /> ADMIN EMAIL RECOGNIZED
              </span>
            )}
            {isStaff && !isAdminEmail && (
              <span className="inline-flex items-center gap-1.5 text-[var(--success)]">
                <CheckCircle2 className="h-3.5 w-3.5" /> STAFF DOMAIN RECOGNIZED
              </span>
            )}
            {isIntern && (
              <span className="inline-flex items-center gap-1.5 text-[var(--warning)]">
                <CheckCircle2 className="h-3.5 w-3.5" /> INTERN DOMAIN RECOGNIZED
              </span>
            )}
            {!isValidDomain && (
              <span className="inline-flex items-center gap-1.5 text-[var(--danger)]">
                <AlertCircle className="h-3.5 w-3.5" /> DOMAIN NOT ALLOWED
              </span>
            )}
          </div>
        )}

        {isIntern && (
          <label className="block md:col-span-2">
            <FieldLabel className="text-[var(--warning)]">
              Supervisor / mentor
            </FieldLabel>
            <span className="relative block">
              <UserCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--warning)]" />
              <Input
                required
                value={supervisor}
                onChange={(event) => setSupervisor(event.target.value)}
                placeholder="Supervisor name"
                className="pl-10"
              />
            </span>
          </label>
        )}

        <label className="block">
          <FieldLabel>Department</FieldLabel>
          <span className="relative block">
            <Building2 className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[var(--faint)]" />
            <Select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="pl-10"
            >
              <option>AI Department</option>
              <option>IT</option>
              <option>HR</option>
              <option>Marketing</option>
              <option>Finance</option>
              <option>Product</option>
            </Select>
          </span>
        </label>

        <label className="block">
          <FieldLabel>Password</FieldLabel>
          <span className="relative block">
            <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--faint)]" />
            <Input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8+ characters"
              className="pl-10"
            />
          </span>
        </label>

        <Button
          type="submit"
          disabled={loading || !isValidDomain}
          className="md:col-span-2"
        >
          {loading ? "Creating access…" : "Create AI desk account"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <p className="mt-8 border-t border-[var(--line)] pt-5 text-center text-xs text-[var(--muted)]">
        Already have access?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--brand-ink)] hover:text-[var(--brand)]"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

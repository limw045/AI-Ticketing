"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/public/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button, FieldLabel, Input } from "@/components/ui/FormField";

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
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      }
    );
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSuccess("If the account exists, a password reset link has been sent.");
  };

  return (
    <AuthShell step="Recovery / 01" backHref="/login">
      <h1 className="font-display text-2xl font-bold tracking-[-0.03em]">
        Recover your access.
      </h1>
      <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
        We will send a secure reset link to your registered staff or Intern
        email.
      </p>

      {error && (
        <div className="mt-6">
          <Alert tone="error" role="alert">
            {error}
          </Alert>
        </div>
      )}
      {success && (
        <div className="mt-6">
          <Alert tone="success">{success}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block">
          <FieldLabel>Email address</FieldLabel>
          <span className="relative block">
            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--faint)]" />
            <Input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="pl-10"
            />
          </span>
        </label>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Sending…" : "Send reset link"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <p className="mt-8 border-t border-[var(--line)] pt-5 text-center text-xs text-[var(--muted)]">
        <Link
          href="/login"
          className="font-semibold text-[var(--brand-ink)] hover:text-[var(--brand)]"
        >
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

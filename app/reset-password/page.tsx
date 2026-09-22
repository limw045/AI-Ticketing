"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthPasswordInput } from "@/components/public/AuthPasswordInput";
import { AuthShell } from "@/components/public/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button, FieldLabel } from "@/components/ui/FormField";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    async function initializeRecovery() {
      const url = new URL(window.location.href);
      const fragment = new URLSearchParams(url.hash.slice(1));
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      const recoveryError = fragment.get("error") || url.searchParams.get("error");
      // Remove credentials from the address bar before any asynchronous work.
      window.history.replaceState(null, "", url.pathname);
      if (recoveryError) throw new Error("This reset link is invalid, expired, or could not be verified. Request a new link below.");
      const supabase = createClient();
      if (accessToken || refreshToken) {
        if (!accessToken || !refreshToken || fragment.get("type") !== "recovery") {
          throw new Error("This is not a valid password reset link. Request a new link below.");
        }
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (sessionError) throw new Error("This reset link could not be verified. Request a new link below.");
      }
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("A valid recovery session is required. Request a new reset link below.");
      setAccountEmail(user.email ?? "");
      setReady(true);
    }
    void initializeRecovery().catch(cause => setError(cause instanceof Error ? cause.message : "Unable to verify this reset link. Please request a new one."));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters for the new password.");
      return;
    }
    if (password !== confirmation) {
      setError("The password confirmation does not match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError(
        "This recovery session is missing or expired. Request a new reset link."
      );
      setLoading(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess("Password updated. Redirecting to your overview…");
    setTimeout(() => router.replace("/dashboard"), 1000);
  };

  return (
    <AuthShell illustration="recovery" backHref="/login">
      <h1 className="font-display text-2xl font-bold tracking-[-0.03em]">
        Set a new password.
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {ready ? `Updating the password for ${accountEmail}.` : error ? "Request a new link to continue." : "Verifying your reset link…"}
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
        {[
          { label: "New password", value: password, set: setPassword },
          { label: "Confirm password", value: confirmation, set: setConfirmation },
        ].map((field) => (
          <label key={field.label} className="block">
            <FieldLabel>{field.label}</FieldLabel>
            <span className="relative block">
              <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--faint)]" />
              <AuthPasswordInput
                aria-label={field.label}
                required
                minLength={8}
                autoComplete="new-password"
                value={field.value}
                onChange={(event) => field.set(event.target.value)}
                className="pl-10"
              />
            </span>
          </label>
        ))}
        <Button
          type="submit"
          disabled={!ready || loading || Boolean(success)}
          className="w-full"
        >
          {loading ? "Updating…" : "Update password"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm"><Link className="text-[var(--brand-ink)] underline" href="/forgot-password">Request a new reset link</Link></p>
    </AuthShell>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/public/AuthShell";
import { Alert } from "@/components/ui/Alert";
import { Button, FieldLabel, Input } from "@/components/ui/FormField";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
    <AuthShell step="Recovery / 02" backHref="/login">
      <h1 className="font-display text-2xl font-bold tracking-[-0.03em]">
        Set a new password.
      </h1>

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
              <Input
                required
                minLength={8}
                type="password"
                value={field.value}
                onChange={(event) => field.set(event.target.value)}
                className="pl-10"
              />
            </span>
          </label>
        ))}
        <Button
          type="submit"
          disabled={loading || Boolean(success)}
          className="w-full"
        >
          {loading ? "Updating…" : "Update password"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>
    </AuthShell>
  );
}

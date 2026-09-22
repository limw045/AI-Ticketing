"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/public/AuthShell";
import { Alert } from "@/components/ui/Alert";
import {
  Button,
  FieldLabel,
  Input,
} from "@/components/ui/FormField";
import { setPortalMode } from "@/lib/portal-mode";
import { destinationForPortal, isKnowledgeDestination, safeInternalNext } from "@/lib/auth-redirect";
import { ArrowRight, KeyRound, Mail, LayoutDashboard, UserRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPortalChoice, setShowPortalChoice] = useState(false);
  const [requestedNext, setRequestedNext] = useState("/dashboard");

  useEffect(() => {
    const callbackError = new URLSearchParams(window.location.search).get("error");
    const verified = new URLSearchParams(window.location.search).get("verified");
    setRequestedNext(safeInternalNext(new URLSearchParams(window.location.search).get("next")));
    if (callbackError) setError(callbackError);
    if (verified === "1") setNotice("Email verified successfully. Sign in to continue.");
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("account_status, role")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!profileError && !profile) {
      router.replace(`/onboarding?next=${encodeURIComponent(requestedNext)}`);
      router.refresh();
      return;
    }
    if (profileError || !profile) {
      await supabase.auth.signOut({ scope: "local" });
      setError(
        "Your staff profile is not ready. Please contact the AI Department administrator."
      );
      setLoading(false);
      return;
    }
    if (profile.account_status !== "active") {
      await supabase.auth.signOut({ scope: "local" });
      setError(
        "This account is suspended. Please contact the AI Department administrator."
      );
      setLoading(false);
      return;
    }
    if (profile.role === "admin" || profile.role === "super_admin") {
      setLoading(false);
      setShowPortalChoice(true);
      return;
    }
    setPortalMode("user");
    router.replace(requestedNext);
    router.refresh();
  };

  const choosePortal = (mode: "user" | "admin") => {
    setPortalMode(mode);
    setShowPortalChoice(false);
    router.replace(destinationForPortal(mode, requestedNext));
    router.refresh();
  };

  return (
    <AuthShell step="01 / Sign in" backHref="/">
      <h1 className="font-display text-2xl font-bold tracking-[-0.03em]">
        Welcome back.
      </h1>
      <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
        {isKnowledgeDestination(requestedNext)
          ? "Sign in to continue to Internal Knowledge. Your original destination will be preserved."
          : "Sign in with your GTMSW staff or Intern account."}
      </p>

      {error && (
        <div className="mt-6">
          <Alert tone="error" role="alert">
            {error}
          </Alert>
        </div>
      )}
      {notice && (
        <div className="mt-6">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}

      <form onSubmit={handleLogin} className="mt-8 space-y-5">
        <label className="block">
          <FieldLabel>Email address</FieldLabel>
          <span className="relative block">
            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--faint)]" />
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              placeholder="name@gtmsw.com.my"
              className="pl-10"
            />
          </span>
        </label>
        <label className="block">
          <FieldLabel>Password</FieldLabel>
          <span className="relative block">
            <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--faint)]" />
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              placeholder="••••••••"
              className="pl-10"
            />
          </span>
        </label>
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-[var(--brand-ink)] hover:text-[var(--brand)]"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in to AI desk"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <p className="mt-8 border-t border-[var(--line)] pt-5 text-center text-xs text-[var(--muted)]">
        New to the desk?{" "}
        <Link
          href="/register"
          className="font-semibold text-[var(--brand-ink)] hover:text-[var(--brand)]"
        >
          Create an account
        </Link>
      </p>

      {showPortalChoice && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/50 px-4 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:items-center sm:px-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="portal-choice-title"
        >
          <section className="surface my-4 max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto p-5 sm:p-7">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand-ink)]">
              Administrative access detected
            </div>
            <h2
              id="portal-choice-title"
              className="mt-3 font-display text-2xl font-bold tracking-[-0.03em]"
            >
              Where would you like to enter?
            </h2>
            <p className="mt-2 text-sm leading-5 text-[var(--muted)]">
              You can work as a regular requester or open the administration
              workspace.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => choosePortal("user")}
                className="group rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-5 text-left transition hover:border-[var(--brand)]"
              >
                <UserRound className="h-5 w-5 text-[var(--brand-ink)]" />
                <strong className="mt-5 block text-sm text-[var(--ink)]">
                  User portal
                </strong>
                <span className="mt-2 block text-xs leading-5 text-[var(--muted)]">
                  Submit and follow your own requests.
                </span>
              </button>
              <button
                onClick={() => choosePortal("admin")}
                className="group rounded-2xl border border-[var(--brand)] bg-[var(--brand-soft)] p-5 text-left transition hover:bg-[var(--brand-soft)]/70"
              >
                <LayoutDashboard className="h-5 w-5 text-[var(--brand-ink)]" />
                <strong className="mt-5 block text-sm text-[var(--brand-ink)]">
                  Admin dashboard
                </strong>
                <span className="mt-2 block text-xs leading-5 text-[var(--brand-ink)]/70">
                  Manage users, incidents, API clients, and analytics.
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </AuthShell>
  );
}

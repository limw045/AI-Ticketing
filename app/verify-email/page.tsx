"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/public/AuthShell";
import { Button } from "@/components/ui/FormField";

const REDIRECT_SECONDS = 10;

export default function VerifyEmailPage() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          router.replace("/login");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <AuthShell step="Verify / Email">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-soft)]">
          <MailCheck className="h-6 w-6 text-[var(--brand-ink)]" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold tracking-[-0.03em]">
          Check your inbox.
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-[var(--muted)]">
          Supabase has sent a verification link to your email. Open it to
          activate your account, then return to sign in.
        </p>
        <div className="mt-6 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--faint)]">
          Returning to login in {seconds}s
        </div>
        <Link href="/login" className="mt-7 block">
          <Button className="w-full">
            Back to sign in now <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </AuthShell>
  );
}

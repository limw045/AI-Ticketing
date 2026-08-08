"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Infinity, MailCheck } from "lucide-react";
import { EditorialGrid } from "@/components/EditorialGrid";

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
    <main className="editorial-shell flex min-h-screen items-center justify-center px-6 py-12">
      <EditorialGrid />
      <section className="editorial-content w-full max-w-lg border border-white/10 bg-[#111113] p-8 text-center shadow-2xl">
        <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4 text-left">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><Infinity className="h-5 w-5" /> Get Blue</div>
          <span className="editorial-mono text-[10px] uppercase tracking-widest text-zinc-500">Verify / Email</span>
        </div>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#6a9bcc]/30 bg-[#6a9bcc]/10 text-[#8db3d6]">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-6 text-4xl font-light tracking-[-0.05em] text-white">Check your inbox.</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-zinc-500">
          Supabase has sent a verification link to your email. Open it to activate your account, then return to sign in.
        </p>
        <div className="editorial-mono mt-6 text-[10px] uppercase tracking-widest text-zinc-600">
          Returning to login in {seconds}s
        </div>
        <Link href="/login" className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-[#6a9bcc] px-5 py-3 text-xs font-bold text-zinc-950 hover:bg-[#84add1]">
          Back to sign in now <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}

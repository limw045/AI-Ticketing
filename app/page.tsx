import Link from "next/link";
import { BrandLockup } from "@/components/ui/BrandLockup";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ArrowRight, BookOpen, ClipboardCheck, Route } from "lucide-react";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <header className="flex items-center justify-between px-5 py-5 sm:px-10">
        <BrandLockup />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-[var(--brand-on)] transition hover:bg-[var(--brand-hover)]"
          >
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-16 sm:px-10">
        <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
          Grant Thornton · Internal Automation Operations
        </div>

        <h1 className="heading-hero max-w-4xl text-4xl sm:text-6xl">
          One place to report, trace, and resolve automation issues.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
          Built for teams that rely on Grant Thornton&apos;s internal automations.
          Automated services can raise structured tickets with logs and runtime
          context, while staff can report blockers directly. Every case stays
          traceable from the first signal to resolution.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-7 py-3.5 text-sm font-bold text-[var(--brand-on)] transition hover:bg-[var(--brand-hover)]"
          >
            Open ticketing workspace <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-7 py-3.5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] hover:text-[var(--brand-ink)]"
          >
            Create staff account
          </Link>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-5 pb-20 sm:grid-cols-3 sm:px-10">
        <div className="surface p-6">
          <ClipboardCheck className="h-5 w-5 text-[var(--brand-ink)]" />
          <h2 className="mt-5 font-display text-base font-bold">
            Automation-ready intake
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Internal tools can create tickets automatically with source details,
            logs, and execution context already attached.
          </p>
        </div>
        <div className="surface p-6">
          <Route className="h-5 w-5 text-[var(--brand-ink)]" />
          <h2 className="mt-5 font-display text-base font-bold">
            Trace every case
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Track ownership, status, comments, subtasks, and audit history from
            the first alert through final resolution.
          </p>
        </div>
        <div className="surface p-6">
          <BookOpen className="h-5 w-5 text-[var(--brand-ink)]" />
          <h2 className="mt-5 font-display text-base font-bold">
            Authenticated internal Knowledge
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            After signing in, use searchable internal guidance to diagnose
            recurring failures and prevent repeat requests.
          </p>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] px-5 py-8 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-[var(--faint)] md:flex-row">
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-[var(--ink)]">
              Home
            </Link>
            <Link href="/faq" className="hover:text-[var(--ink)]">
              FAQs
            </Link>
          </div>
          <span>© 2026 Grant Thornton · AI Department. All rights reserved.</span>
        </div>
      </footer>
    </main>
  );
}

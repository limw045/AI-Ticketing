import { BrandLockup } from "@/components/ui/BrandLockup";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function AuthShell({
  step,
  children,
}: {
  step?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--canvas)] px-4 py-12">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="mb-8">
        <BrandLockup />
      </div>

      <section className="surface w-full max-w-md p-8">
        {step && (
          <div className="mb-6 flex items-center justify-between border-b border-[var(--line)] pb-4">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Grant Thornton · AI Department
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-ink)]">
              {step}
            </span>
          </div>
        )}
        {children}
      </section>

      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
        GTMSW · 2026
      </p>
    </main>
  );
}

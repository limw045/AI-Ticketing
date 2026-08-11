import { cn } from "@/lib/cn";
import { BackButton } from "@/components/ui/BackButton";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backHref,
  backLabel = "Back",
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div>
        {backHref && <BackButton href={backHref} label={backLabel} className="mb-4" />}
        {eyebrow && (
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brand-ink)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
            {eyebrow}
          </div>
        )}
        <h1 className="heading-page text-3xl md:text-4xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </header>
  );
}

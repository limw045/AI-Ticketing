import { cn } from "@/lib/cn";

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "min-h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--ink)] outline-none transition placeholder:text-[var(--faint)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] sm:text-sm",
        className
      )}
    />
  );
}

export function Select({
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "min-h-11 w-full appearance-none rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-3 text-base font-medium text-[var(--ink)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] sm:text-sm",
        className
      )}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-3 text-base leading-relaxed text-[var(--ink)] outline-none transition placeholder:text-[var(--faint)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] sm:text-sm",
        className
      )}
    />
  );
}

export function FieldLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary:
      "button-action button-action--primary bg-[var(--brand)] text-[var(--brand-on)] shadow-[var(--shadow-sm)]",
    secondary:
      "button-action button-action--secondary bg-[var(--surface)] border border-[var(--line-strong)] text-[var(--ink)]",
    ghost:
      "button-action button-action--ghost bg-transparent text-[var(--muted)]",
    danger:
      "button-action button-action--danger bg-[var(--danger-soft)] text-[var(--danger)]",
  };
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface flex flex-col items-center justify-center px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 h-10 w-10 rounded-full bg-[var(--surface-3)]" />
      <h3 className="font-display text-lg font-bold text-[var(--ink)]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

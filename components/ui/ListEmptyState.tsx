import Link from "next/link";

export function ListEmptyState({ title, description, actionHref, actionLabel, onAction }: { title: string; description: string; actionHref?: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="surface px-5 py-8 text-center">
    <h3 className="font-display text-base font-bold text-[var(--ink)]">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>
    {actionHref && actionLabel && <Link href={actionHref} className="mt-5 inline-flex min-h-11 items-center rounded-full border border-[var(--line-strong)] px-5 text-sm font-semibold text-[var(--ink)]">{actionLabel}</Link>}
    {onAction && actionLabel && <button type="button" onClick={onAction} className="mt-5 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[var(--line-strong)] px-5 text-sm font-semibold text-[var(--ink)]">{actionLabel}</button>}
  </div>;
}

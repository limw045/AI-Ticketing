import { cn } from "@/lib/cn";
import { CountUp } from "@/components/react-bits/CountUp";

export function MetricCard({
  label,
  value,
  valueClassName = "",
  hint,
  icon,
  animate = false,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  animate?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("metric-card surface p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          {label}
        </span>
        {icon && <span className="text-[var(--muted)]">{icon}</span>}
      </div>
      <div
        className={cn(
          "mt-6 font-display text-4xl font-bold tracking-[-0.05em] text-[var(--ink)]",
          valueClassName
        )}
      >
        {animate && typeof value === "number" ? (
          <CountUp to={value} />
        ) : (
          value
        )}
      </div>
      {hint && <div className="mt-3 text-xs text-[var(--muted)]">{hint}</div>}
    </div>
  );
}

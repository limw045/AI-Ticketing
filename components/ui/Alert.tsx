import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

const styles = {
  error: {
    wrap: "border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]",
    icon: AlertCircle,
  },
  success: {
    wrap: "border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]",
    icon: CheckCircle2,
  },
  warning: {
    wrap: "border-[var(--warning)]/25 bg-[var(--warning-soft)] text-[var(--warning)]",
    icon: TriangleAlert,
  },
  info: {
    wrap: "border-[var(--info)]/25 bg-[var(--info-soft)] text-[var(--info)]",
    icon: Info,
  },
};

export function Alert({
  tone = "info",
  children,
  className = "",
  role = "status",
}: {
  tone?: keyof typeof styles;
  children: React.ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  const s = styles[tone];
  const Icon = s.icon;
  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-5",
        s.wrap,
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

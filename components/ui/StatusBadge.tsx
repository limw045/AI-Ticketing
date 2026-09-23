import { cn } from "@/lib/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const tones: Record<Tone, string> = {
  neutral:
    "bg-[var(--surface-3)] text-[var(--muted)] border-[var(--line-strong)]",
  success:
    "bg-[var(--success-soft)] text-[var(--success)] border-transparent",
  warning:
    "bg-[var(--warning-soft)] text-[var(--warning)] border-transparent",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-transparent",
  info: "bg-[var(--info-soft)] text-[var(--info)] border-transparent",
  brand: "bg-[var(--brand-soft)] text-[var(--brand-ink)] border-transparent",
};

export function StatusBadge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "status-badge inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "open":
    case "in_progress":
      return "info";
    case "action_required":
    case "on_hold":
      return "warning";
    case "resolved":
      return "success";
    case "failed":
      return "danger";
    case "closed":
      return "neutral";
    default:
      return "neutral";
  }
}

export function priorityTone(priority: string): Tone {
  switch (priority) {
    case "urgent":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "info";
    default:
      return "neutral";
  }
}

export function severityTone(severity: string): Tone {
  switch (severity) {
    case "critical":
      return "danger";
    case "warning":
      return "warning";
    default:
      return "info";
  }
}

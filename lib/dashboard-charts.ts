export const PRESETS = [
  "Yesterday",
  "Today",
  "Last 7 days",
  "Last 30 days",
  "Last 90 days",
] as const;

export type LastDaysPreset = (typeof PRESETS)[number];

export interface TicketLike {
  created_at: string;
  category?: string | null;
  status?: string | null;
  ticket_number?: string | null;
  title?: string | null;
  priority?: string | null;
  author?: { department?: string | null } | null;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface Period {
  current: DateRange;
  previous: DateRange;
  previousEndExclusive: Date;
}

const DAY_MS = 86_400_000;

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function getPeriod(
  preset: LastDaysPreset,
  now: Date = new Date()
): Period {
  const today = startOfDay(now);
  const start = new Date(today);
  const end = new Date(today);

  if (preset === "Yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (preset !== "Today") {
    const days =
      preset === "Last 7 days" ? 7 : preset === "Last 30 days" ? 30 : 90;
    start.setDate(start.getDate() - (days - 1));
  }

  const previousEndExclusive = startOfDay(start);
  const periodDays = (end.getTime() - start.getTime()) / DAY_MS + 1;
  const previousStart = new Date(previousEndExclusive);
  previousStart.setDate(previousStart.getDate() - periodDays);
  const previousEnd = new Date(previousEndExclusive);
  previousEnd.setDate(previousEnd.getDate() - 1);

  return {
    current: { start, end },
    previous: { start: previousStart, end: previousEnd },
    previousEndExclusive,
  };
}

export function ticketsInRange(
  tickets: TicketLike[],
  start: Date,
  end: Date
): TicketLike[] {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime() + DAY_MS;
  return tickets.filter((t) => {
    const ms = new Date(t.created_at).getTime();
    return Number.isFinite(ms) && ms >= s && ms < e;
  });
}

export function getTrend(
  currentCount: number,
  previousCount: number
): { pct: string; direction: "up" | "down" | "flat" | "new" } {
  if (currentCount === 0 && previousCount === 0) {
    return { pct: "0%", direction: "flat" };
  }
  if (previousCount === 0) {
    return { pct: "New", direction: "new" };
  }
  const delta = ((currentCount - previousCount) / previousCount) * 100;
  return {
    pct: `${delta.toFixed(1)}%`,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
  };
}

export function getCategoryData(
  tickets: TicketLike[]
): { name: string; count: number }[] {
  const counts: Record<string, number> = {};
  tickets.forEach((t) => {
    const cat = t.category || "Uncategorized";
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function getDeptOptions(tickets: TicketLike[]): string[] {
  const set = new Set<string>();
  tickets.forEach((t) => set.add(t.author?.department || "General"));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function getDeptData(
  tickets: TicketLike[],
  departments: string[]
): { name: string; value: number }[] {
  const selected = new Set(departments);
  if (selected.size === 0) return [];
  const counts: Record<string, number> = {};
  tickets.forEach((t) => {
    const dept = t.author?.department || "General";
    if (selected.has(dept)) counts[dept] = (counts[dept] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

export function getTopCategory(tickets: TicketLike[]): string {
  return getCategoryData(tickets)[0]?.name ?? "";
}

export function getResolutionRate(tickets: TicketLike[]): number {
  if (tickets.length === 0) return 0;
  const resolved = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  ).length;
  return Math.round((resolved / tickets.length) * 100);
}

export function formatFilenameDate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildDeptCsv(tickets: TicketLike[]): string {
  const headers = [
    "Ticket Number",
    "Title",
    "Category",
    "Priority",
    "Status",
    "Department",
    "Created At",
  ];
  const rows = tickets.map((t) => [
    t.ticket_number ?? "",
    t.title ?? "",
    t.category ?? "",
    t.priority ?? "",
    t.status ?? "",
    t.author?.department || "General",
    t.created_at,
  ]);
  const esc = (v: string) => `"${String(v).replaceAll('"', '""')}"`;
  return [headers, ...rows].map((row) => row.map(esc).join(",")).join("\n");
}

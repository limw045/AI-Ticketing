"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  Cell,
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  Minus,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  buildDeptCsv,
  formatFilenameDate,
  getCategoryData,
  getDeptData,
  getDeptOptions,
  getPeriod,
  getResolutionRate,
  getTopCategory,
  getTrend,
  ticketsInRange,
  PRESETS,
  type LastDaysPreset,
  type TicketLike,
} from "@/lib/dashboard-charts";

const DEPT_COLORS = [
  "var(--chart-series-1)",
  "var(--chart-series-2)",
  "var(--chart-series-3)",
  "var(--chart-series-4)",
  "var(--chart-series-5)",
  "var(--chart-series-6)",
];

const tooltipStyle = {
  backgroundColor: "var(--surface)",
  borderColor: "var(--line-strong)",
  borderRadius: 12,
  color: "var(--ink)",
  fontSize: 12,
};

function TrendBadge({ trend }: { trend: ReturnType<typeof getTrend> }) {
  const Icon =
    trend.direction === "up" || trend.direction === "new"
      ? TrendingUp
      : trend.direction === "down"
        ? TrendingDown
        : Minus;
  const tone =
    trend.direction === "up" || trend.direction === "new"
      ? "text-[var(--success)]"
      : trend.direction === "down"
        ? "text-[var(--danger)]"
        : "text-[var(--muted)]";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium",
        tone
      )}
    >
      <Icon className="me-1 h-3.5 w-3.5" aria-hidden="true" />
      {trend.pct}
    </span>
  );
}

function DateRangeMenu({
  preset,
  onChange,
  menuId,
  buttonId,
}: {
  preset: LastDaysPreset;
  onChange: (p: LastDaysPreset) => void;
  menuId: string;
  buttonId: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        id={buttonId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center text-sm font-medium text-[var(--muted)] transition hover:text-[var(--ink)]"
      >
        {preset}
        <ChevronDown className="ms-1.5 h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Date range"
          className="absolute bottom-full left-0 z-20 mb-2 w-44 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-2 shadow-lg"
        >
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              role="menuitemradio"
              aria-checked={p === preset}
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm transition hover:bg-[var(--surface-3)]",
                p === preset
                  ? "font-semibold text-[var(--ink)]"
                  : "text-[var(--muted)]"
              )}
            >
              {p}
              {p === preset && (
                <Check className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChartCardFooter({
  preset,
  onChange,
  reportLabel,
  reportHref,
}: {
  preset: LastDaysPreset;
  onChange: (p: LastDaysPreset) => void;
  reportLabel: string;
  reportHref: string;
}) {
  const slug = reportLabel.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className="flex flex-col items-stretch justify-between gap-2 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center md:pt-5">
      <DateRangeMenu
        preset={preset}
        onChange={onChange}
        menuId={`range-menu-${slug}`}
        buttonId={`range-button-${slug}`}
      />
      <Link
        href={reportHref}
        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[var(--brand-ink)] transition hover:bg-[var(--surface-3)]"
      >
        {reportLabel}
        <ArrowRight className="ms-1.5 h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

export default function DashboardCharts({ tickets }: { tickets: any[] }) {
  const [categoryPreset, setCategoryPreset] =
    useState<LastDaysPreset>("Last 7 days");
  const [deptPreset, setDeptPreset] = useState<LastDaysPreset>("Last 7 days");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);

  const typed: TicketLike[] = tickets;
  const deptOptions = getDeptOptions(typed);
  const deptOptionsKey = deptOptions.join("|");

  useEffect(() => {
    setSelectedDepts((prev) =>
      prev.length === 0
        ? deptOptions
        : prev.filter((d) => deptOptions.includes(d))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptOptionsKey]);

  const period = getPeriod(categoryPreset);
  const currentTickets = ticketsInRange(
    typed,
    period.current.start,
    period.current.end
  );
  const previousTickets = ticketsInRange(
    typed,
    period.previous.start,
    period.previous.end
  );
  const trend = getTrend(currentTickets.length, previousTickets.length);
  const categoryData = getCategoryData(currentTickets);
  const topCategory = getTopCategory(currentTickets);
  const resolutionRate = getResolutionRate(currentTickets);

  const deptPeriod = getPeriod(deptPreset);
  const deptTickets = ticketsInRange(
    typed,
    deptPeriod.current.start,
    deptPeriod.current.end
  );
  const deptData = getDeptData(deptTickets, selectedDepts);
  const deptTotal = deptData.reduce((sum, d) => sum + d.value, 0);
  const topDept = deptData[0];
  const topDeptPct =
    topDept && deptTotal > 0 ? Math.round((topDept.value / deptTotal) * 100) : 0;

  const exportFiltered = () => {
    if (deptTickets.length === 0) return;
    const csv = buildDeptCsv(deptTickets);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `departments-${formatFilenameDate(new Date())}-${deptPreset
      .replace(/\s+/g, "-")
      .toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const categoryHref = `/admin/tickets?range=${encodeURIComponent(categoryPreset)}`;
  const deptHref = `/admin/tickets?range=${encodeURIComponent(
    deptPreset
  )}&departments=${encodeURIComponent(selectedDepts.join(","))}`;

  return (
    <>
      <section className="surface">
        <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 pb-4 pt-5 md:px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--brand-soft)]">
            <UsersRound className="h-6 w-6 text-[var(--brand-ink)]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="flex flex-wrap items-center gap-2 text-2xl font-semibold text-[var(--ink)]">
              {currentTickets.length.toLocaleString()}
              <TrendBadge trend={trend} />
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Tickets received in selected period
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 px-4 pt-4 sm:grid-cols-2 sm:gap-4 md:px-6">
          <dl className="flex min-w-0 items-center gap-1.5">
            <dt className="text-sm text-[var(--muted)]">Top category:</dt>
            <dd
              className="truncate text-sm font-semibold text-[var(--ink)]"
              title={topCategory}
            >
              {topCategory || "—"}
            </dd>
          </dl>
          <dl className="flex items-center gap-1.5 sm:justify-end">
            <dt className="text-sm text-[var(--muted)]">Resolution:</dt>
            <dd className="text-sm font-semibold text-[var(--ink)]">
              {resolutionRate}%
            </dd>
          </dl>
        </div>

        <div className="px-4 pb-4 pt-4 md:px-6">
          {categoryData.length === 0 ? (
            <div className="flex min-h-[144px] flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--line)] px-4 text-center">
              <p className="text-sm font-semibold text-[var(--ink)]">No tickets in this period</p>
              <p className="text-sm text-[var(--muted)]">Try another date range or inspect the full queue.</p>
              <Link href="/admin/tickets" className="text-sm font-semibold text-[var(--brand-ink)]">Open ticket queue</Link>
            </div>
          ) : (
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    stroke="var(--faint)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "var(--line)" }}
                    interval="preserveStartEnd"
                    minTickGap={16}
                    tickFormatter={(value) => String(value).slice(0, 8)}
                    tick={{ fill: "var(--muted)" }}
                  />
                  <YAxis
                    stroke="var(--faint)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: "var(--muted)" }}
                  />
                  <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="count"
                    fill="var(--brand)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="px-4 pb-5 md:px-6">
          <ChartCardFooter
            preset={categoryPreset}
            onChange={setCategoryPreset}
            reportLabel="Ticket report"
            reportHref={categoryHref}
          />
        </div>
      </section>

      <section className="surface">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-4 md:px-6">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold">
              Tickets by department
            </h2>
            <CircleHelp
              className="h-4 w-4 cursor-help text-[var(--muted)]"
              aria-label="Share of requests by department for the selected period"
            />
          </div>
          <button
            type="button"
            onClick={exportFiltered}
            className="inline-flex items-center justify-center rounded-[var(--radius-sm)] p-2 text-[var(--muted)] transition hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
            aria-label="Download departments CSV"
          >
            <Download className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 pt-4 md:px-6">
          {deptOptions.length === 0 ? (
            <span className="text-sm text-[var(--faint)]">No departments yet.</span>
          ) : (
            deptOptions.map((dept) => {
              const checked = selectedDepts.includes(dept);
              return (
                <label
                  key={dept}
                  className="flex cursor-pointer select-none items-center gap-2 text-sm text-[var(--ink)]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelectedDepts((prev) =>
                        checked
                          ? prev.filter((d) => d !== dept)
                          : [...prev, dept]
                      )
                    }
                  className="h-5 w-5 rounded border-[var(--line-strong)] bg-[var(--surface-2)] accent-[var(--brand)]"
                  />
                  {dept}
                </label>
              );
            })
          )}
          {selectedDepts.length === 0 && deptOptions.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedDepts(deptOptions)}
              className="text-sm font-medium text-[var(--brand-ink)] underline underline-offset-4 hover:text-[var(--brand)]"
            >
              Select all
            </button>
          )}
        </div>

        <div className="px-4 pb-4 pt-4 md:px-6">
          {deptData.length === 0 ? (
            <div className="flex min-h-[144px] flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--line)] px-4 text-center">
              <p className="text-sm font-semibold text-[var(--ink)]">{deptOptions.length === 0 ? "No departments yet" : selectedDepts.length === 0 ? "No departments selected" : "No tickets in this period"}</p>
              <p className="text-sm text-[var(--muted)]">{deptOptions.length === 0 ? "Department trends will appear as requests arrive." : selectedDepts.length === 0 ? "Select departments above to compare their request volume." : "Try another date range or inspect the full queue."}</p>
              {deptOptions.length === 0 ? <Link href="/admin/staff" className="text-sm font-semibold text-[var(--brand-ink)]">Manage departments</Link> : selectedDepts.length === 0 ? <button type="button" onClick={() => setSelectedDepts(deptOptions)} className="text-sm font-semibold text-[var(--brand-ink)]">Select all departments</button> : <Link href="/admin/tickets" className="text-sm font-semibold text-[var(--brand-ink)]">Open ticket queue</Link>}
            </div>
          ) : (
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={92}
                    paddingAngle={2}
                    cornerRadius={4}
                    startAngle={90}
                    endAngle={-270}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  >
                    {deptData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={DEPT_COLORS[index % DEPT_COLORS.length]}
                      />
                    ))}
                    <Label
                      position="center"
                      content={(props) => {
                        const { x, y } = props;
                        return (
                          <text x={x} y={y} textAnchor="middle" dominantBaseline="central">
                            <tspan
                              x={x}
                              dy="-0.35em"
                              style={{
                                fontSize: 22,
                                fontWeight: 700,
                                fill: "var(--ink)",
                              }}
                            >
                              {topDeptPct}%
                            </tspan>
                            <tspan
                              x={x}
                              dy="1.35em"
                              style={{
                                fontSize: 11,
                                fontWeight: 500,
                                fill: "var(--muted)",
                              }}
                            >
                              {topDept ? topDept.name.slice(0, 20) : ""}
                            </tspan>
                          </text>
                        );
                      }}
                    />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="px-4 pb-5 md:px-6">
          <ChartCardFooter
            preset={deptPreset}
            onChange={setDeptPreset}
            reportLabel="Department report"
            reportHref={deptHref}
          />
        </div>
      </section>
    </>
  );
}

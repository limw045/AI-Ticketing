"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateFilter, parseDateFilter } from "@/lib/date-display";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const pad = (value: number) => String(value).padStart(2, "0");
const calendarDate = (value: string) => {
  const date = value ? new Date(`${value}T00:00:00Z`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export function DateFilterInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [display, setDisplay] = useState(() => formatDateFilter(value));
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const selectedDate = calendarDate(value);
  const [viewYear, setViewYear] = useState(selectedDate.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getUTCMonth());
  const rootRef = useRef<HTMLSpanElement>(null);
  const errorId = useId();
  const calendarId = useId();

  useEffect(() => {
    setDisplay(formatDateFilter(value));
    setInvalid(false);
    if (value) {
      const date = calendarDate(value);
      setViewYear(date.getUTCFullYear());
      setViewMonth(date.getUTCMonth());
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const changeMonth = (delta: number) => {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  };
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const leadingDays = (new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay() + 6) % 7;
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(viewYear, viewMonth, 1)));

  return (
    <span ref={rootRef} className={cn("relative block min-w-0 focus-within:rounded-[var(--radius-sm)] focus-within:ring-2 focus-within:ring-[var(--color-focus)]", className)}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={`${label}, day/month/year`}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        placeholder="dd/mm/yyyy"
        value={display}
        maxLength={10}
        onChange={(event) => {
          const next = event.target.value;
          setDisplay(next);
          setInvalid(false);
          if (!next) onChange("");
          else {
            const iso = parseDateFilter(next);
            if (iso) onChange(iso);
          }
        }}
        onBlur={() => setInvalid(Boolean(display && !parseDateFilter(display)))}
        className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] py-2.5 pl-3 pr-11 text-sm text-[var(--ink)] placeholder:text-[var(--faint)] focus:border-[var(--brand)] focus:outline-none"
      />
      <button type="button" aria-label={`${label} calendar`} aria-haspopup="dialog" aria-expanded={open} aria-controls={calendarId} onClick={() => setOpen((current) => !current)} className="absolute right-0 top-0 flex h-11 w-10 items-center justify-center text-[var(--muted)]"><CalendarDays className="h-4 w-4" aria-hidden="true" /></button>
      {invalid && <span id={errorId} role="alert" className="absolute left-0 top-full z-10 mt-1 rounded bg-[var(--danger-soft)] px-2 py-1 text-xs text-[var(--danger)] shadow-sm">Use dd/mm/yyyy.</span>}
      {open && <span id={calendarId} role="dialog" aria-label={`Choose ${label.toLowerCase()}`} className="absolute left-0 top-full z-50 mt-2 block w-[280px] max-w-[calc(100vw-3rem)] rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--shadow-md)] md:left-auto md:right-0">
        <span className="flex items-center justify-between gap-2"><button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)]"><ChevronLeft className="h-4 w-4" /></button><strong className="text-sm font-semibold">{monthLabel}</strong><button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--surface-2)]"><ChevronRight className="h-4 w-4" /></button></span>
        <span className="mt-2 grid grid-cols-7 gap-1 text-center">{WEEKDAYS.map((day) => <span key={day} className="py-1 text-xs font-medium text-[var(--muted)]">{day}</span>)}{Array.from({ length: leadingDays }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => { const day = index + 1; const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`; return <button key={day} type="button" aria-label={`${day} ${monthLabel}`} aria-pressed={value === iso} onClick={() => { onChange(iso); setOpen(false); }} className={cn("flex h-8 items-center justify-center rounded-[var(--radius-sm)] text-[13px] hover:bg-[var(--surface-2)]", value === iso && "bg-[var(--brand)] text-[var(--brand-on)] hover:bg-[var(--brand-hover)]")}>{day}</button>; })}</span>
        <span className="mt-2 flex justify-end border-t border-[var(--line)] pt-2"><button type="button" onClick={() => { onChange(""); setOpen(false); }} className="min-h-8 px-2 text-[13px] font-semibold text-[var(--brand-ink)]">Clear date</button></span>
      </span>}
    </span>
  );
}

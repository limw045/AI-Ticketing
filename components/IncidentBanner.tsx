"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Info, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseSchema } from "@/lib/supabase/config";
import { cn } from "@/lib/cn";

type IncidentSeverity = "info" | "warning" | "critical";

interface Incident {
  id: string;
  title: string;
  message: string;
  severity: IncidentSeverity;
}

const severityRank: Record<IncidentSeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

const severityStyles: Record<IncidentSeverity, string> = {
  info: "border-[var(--info)]/35 bg-[var(--info-soft)] text-[var(--info)]",
  warning:
    "border-[var(--warning)]/35 bg-[var(--warning-soft)] text-[var(--warning)]",
  critical:
    "border-[var(--danger)]/35 bg-[var(--danger-soft)] text-[var(--danger)]",
};

function MarqueeItems({ incidents }: { incidents: Incident[] }) {
  const repeatedIncidents = Array.from(
    { length: Math.max(1, Math.ceil(6 / incidents.length)) },
    () => incidents
  ).flat();

  return (
    <div className="incident-marquee-group">
      {repeatedIncidents.map((incident, index) => (
        <span
          key={`${incident.id}-${index}`}
          className="inline-flex items-center gap-2"
        >
          <strong className="font-semibold text-current">{incident.title}</strong>
          <span className="opacity-80">— {incident.message}</span>
          <span className="mx-4 h-1 w-1 rounded-full bg-current opacity-45" />
        </span>
      ))}
    </div>
  );
}

export function IncidentBanner({ canManage = false }: { canManage?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const fetchIncidents = useCallback(async () => {
    const { data } = await supabase
      .from("incidents")
      .select("id, title, message, severity")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (data) setIncidents(data as Incident[]);
  }, [supabase]);

  useEffect(() => {
    void fetchIncidents();
    const channel = supabase
      .channel("global-incidents")
      .on(
        "postgres_changes",
        { event: "*", schema: getSupabaseSchema(), table: "incidents" },
        () => void fetchIncidents()
      )
      .subscribe();

    const onFocus = () => void fetchIncidents();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [fetchIncidents, supabase]);

  if (incidents.length === 0) return null;

  const highestSeverity = incidents.reduce<IncidentSeverity>(
    (highest, incident) =>
      severityRank[incident.severity] > severityRank[highest]
        ? incident.severity
        : highest,
    "info"
  );
  const StatusIcon =
    highestSeverity === "critical"
      ? AlertTriangle
      : highestSeverity === "warning"
        ? Radio
        : Info;

  return (
    <section
      aria-label="Active incidents"
      aria-live="polite"
      className={cn(
        "mb-6 flex min-h-11 items-stretch overflow-hidden rounded-xl border shadow-[var(--shadow-sm)]",
        severityStyles[highestSeverity]
      )}
    >
      <span className="sr-only">
        {incidents
          .map((incident) => `${incident.title}: ${incident.message}`)
          .join(". ")}
      </span>
      <div className="relative z-10 flex shrink-0 items-center gap-2 border-r border-current/20 bg-inherit px-3 sm:px-4">
        <StatusIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden font-mono text-xs font-bold uppercase tracking-[var(--tracking-eyebrow)] sm:inline">
          Service status
        </span>
        <strong className="whitespace-nowrap text-xs">
          {incidents.length} active
        </strong>
      </div>

      <div
        className="incident-marquee flex min-w-0 flex-1 items-center"
        aria-hidden="true"
      >
        <div className="incident-marquee-track text-xs">
          <MarqueeItems incidents={incidents} />
          <div aria-hidden="true">
            <MarqueeItems incidents={incidents} />
          </div>
        </div>
      </div>

      {canManage && (
        <Link
          href="/admin/incidents"
          className="relative z-10 flex shrink-0 items-center gap-1.5 border-l border-current/20 bg-inherit px-3 text-xs font-semibold underline-offset-4 hover:underline sm:px-4"
        >
          <span className="hidden sm:inline">Manage</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}

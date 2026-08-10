"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle } from "lucide-react";

export function IncidentBanner() {
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    const fetchIncidents = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("incidents")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (data) setIncidents(data);
    };
    fetchIncidents();
  }, []);

  if (incidents.length === 0) return null;

  return (
    <div className="space-y-3 mb-8">
      {incidents.map((incident, idx) => (
        <div
          key={incident.id}
          className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-4"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--warning)]" />
            <div>
              <span className="block text-sm font-bold tracking-wide text-[var(--warning)]">
                {incident.title}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--warning)]/80">
                {incident.message}
              </span>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--warning)]">
            Incident {idx + 1} · Active
          </span>
        </div>
      ))}
    </div>
  );
}

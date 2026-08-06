"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, Info, XCircle } from "lucide-react";

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
    <div className="space-y-2.5 mb-6">
      {incidents.map((incident) => (
        <div
          key={incident.id}
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-md ${
            incident.severity === "critical"
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : incident.severity === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-blue-50 border-blue-200 text-blue-900"
          }`}
        >
          <div className="flex items-center gap-3">
            {incident.severity === "critical" ? (
              <XCircle className="w-5 h-5 shrink-0 text-rose-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
            )}
            <div>
              <span className="font-bold text-sm block">{incident.title}</span>
              <span className="text-xs opacity-90 block mt-0.5">{incident.message}</span>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
            Active System Outage
          </span>
        </div>
      ))}
    </div>
  );
}

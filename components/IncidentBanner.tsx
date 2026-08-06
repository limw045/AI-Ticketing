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
    <div className="space-y-2 mb-6">
      {incidents.map((incident) => (
        <div
          key={incident.id}
          className={`p-4 rounded-2xl border backdrop-blur-md flex items-center justify-between shadow-lg ${
            incident.severity === "critical"
              ? "bg-red-950/80 border-red-700/80 text-red-200"
              : incident.severity === "warning"
              ? "bg-amber-950/80 border-amber-600/80 text-amber-200"
              : "bg-blue-950/80 border-blue-600/80 text-blue-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {incident.severity === "critical" ? (
              <XCircle className="w-5 h-5 shrink-0 text-red-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            )}
            <div>
              <span className="font-bold text-sm block">{incident.title}</span>
              <span className="text-xs opacity-90 block mt-0.5">{incident.message}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-black/40 border border-white/10 font-bold">
            System Incident Active
          </span>
        </div>
      ))}
    </div>
  );
}

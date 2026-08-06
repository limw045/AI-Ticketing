"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, XCircle } from "lucide-react";

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
          className="p-4 rounded-2xl bg-[#141417] border border-amber-500/30 text-amber-200 flex items-center justify-between shadow-xl"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <span className="font-bold text-sm block tracking-wide">{incident.title}</span>
              <span className="text-xs text-amber-200/80 block mt-0.5">{incident.message}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
            STEP 0{idx + 1} • INCIDENT ACTIVE
          </span>
        </div>
      ))}
    </div>
  );
}

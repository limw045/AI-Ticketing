"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Ticket, HelpCircle, LayoutDashboard, LogOut, PlusCircle, Cpu } from "lucide-react";

export function Navbar() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const getProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) setProfile(data);
      }
    };
    getProfile();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-black/5 px-6 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Header: Apple/Stripe Porcelain Clean */}
        <Link href="/tickets" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center text-white group-hover:bg-blue-600 transition shadow-sm">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-950 tracking-tight block">GTMSW AI Dept</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-100 text-zinc-600 border border-black/5">AI Desk</span>
            </div>
            <span className="text-[11px] font-medium text-zinc-400 block leading-tight">Internal Support Portal</span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="flex items-center gap-1 bg-zinc-100/70 p-1 rounded-xl border border-black/5 text-xs font-medium text-zinc-600">
          <Link href="/tickets" className="px-3 py-1.5 rounded-lg hover:bg-white hover:text-zinc-900 transition flex items-center gap-1.5 font-medium">
            <Ticket className="w-3.5 h-3.5" /> Tickets
          </Link>
          <Link href="/faq" className="px-3 py-1.5 rounded-lg hover:bg-white hover:text-zinc-900 transition flex items-center gap-1.5 font-medium">
            <HelpCircle className="w-3.5 h-3.5" /> Knowledge Base
          </Link>
          {profile?.role && profile.role !== "employee" && (
            <Link href="/admin/dashboard" className="px-3 py-1.5 rounded-lg bg-white text-blue-600 font-semibold transition flex items-center gap-1.5 shadow-xs border border-black/5">
              <LayoutDashboard className="w-3.5 h-3.5" /> Analytics
            </Link>
          )}
        </nav>

        {/* Right User Actions */}
        <div className="flex items-center gap-3">
          <Link href="/tickets/new" className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-sm">
            <PlusCircle className="w-3.5 h-3.5" /> New AI Ticket
          </Link>

          {profile && (
            <div className="flex items-center gap-2 pl-3 border-l border-black/5">
              <div className="text-right">
                <span className="text-xs font-semibold text-zinc-900 block leading-tight">{profile.display_name}</span>
                <span className="text-[10px] font-mono text-zinc-400 block">
                  {profile.user_type === "intern" ? (
                    <span className="text-amber-700 font-semibold bg-amber-50 px-1 py-0.5 rounded border border-amber-200">Intern</span>
                  ) : (
                    <span>Staff ({profile.department})</span>
                  )}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-red-600 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

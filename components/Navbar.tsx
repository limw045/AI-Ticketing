"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Ticket, HelpCircle, LayoutDashboard, LogOut, PlusCircle, ShieldAlert } from "lucide-react";

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
    <header className="sticky top-0 z-50 backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800/80 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Header */}
        <Link href="/tickets" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
            <Ticket className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-zinc-100 tracking-tight block">GTMSW Support</span>
            <span className="text-[10px] font-mono text-zinc-500 block leading-tight">Internal Portal</span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="flex items-center gap-1 bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800/80 text-xs">
          <Link href="/tickets" className="px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition flex items-center gap-1.5 text-zinc-300 font-medium">
            <Ticket className="w-3.5 h-3.5" /> Tickets
          </Link>
          <Link href="/faq" className="px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition flex items-center gap-1.5 text-zinc-300 font-medium">
            <HelpCircle className="w-3.5 h-3.5" /> Q&A Knowledge Base
          </Link>
          {profile?.role && profile.role !== "employee" && (
            <Link href="/admin/dashboard" className="px-3 py-1.5 rounded-xl hover:bg-blue-950/50 text-blue-400 transition flex items-center gap-1.5 font-medium border border-blue-800/40">
              <LayoutDashboard className="w-3.5 h-3.5" /> Analytics Dashboard
            </Link>
          )}
        </nav>

        {/* Right User Actions */}
        <div className="flex items-center gap-3">
          <Link href="/tickets/new" className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition flex items-center gap-1.5 shadow-lg shadow-blue-500/20">
            <PlusCircle className="w-3.5 h-3.5" /> New Ticket
          </Link>

          {profile && (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800/80">
              <div className="text-right">
                <span className="text-xs font-semibold text-zinc-200 block leading-tight">{profile.display_name}</span>
                <span className="text-[10px] text-zinc-400 font-mono block">
                  {profile.user_type === "intern" ? (
                    <span className="text-amber-400 font-bold">Intern</span>
                  ) : (
                    <span className="text-zinc-400">Staff ({profile.department})</span>
                  )}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

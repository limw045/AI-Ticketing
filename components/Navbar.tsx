"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Ticket, HelpCircle, LayoutDashboard, LogOut, PlusCircle, Sparkles, Cpu } from "lucide-react";

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
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/85 border-b border-slate-200/80 px-6 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Header: GTMSW AI Department Support */}
        <Link href="/tickets" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-500/30 flex items-center justify-center text-white group-hover:scale-105 transition shadow-md shadow-blue-500/20">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base text-slate-900 tracking-tight block">GTMSW AI Department</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">AI Team Desk</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 block leading-tight">Internal AI Support & Request System</span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 text-xs font-medium text-slate-600">
          <Link href="/tickets" className="px-3.5 py-1.5 rounded-xl hover:bg-white hover:text-blue-600 transition flex items-center gap-1.5 font-semibold">
            <Ticket className="w-4 h-4" /> Tickets
          </Link>
          <Link href="/faq" className="px-3.5 py-1.5 rounded-xl hover:bg-white hover:text-blue-600 transition flex items-center gap-1.5 font-semibold">
            <HelpCircle className="w-4 h-4" /> Q&A Knowledge Base
          </Link>
          {profile?.role && profile.role !== "employee" && (
            <Link href="/admin/dashboard" className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition flex items-center gap-1.5 font-bold border border-blue-200/60">
              <LayoutDashboard className="w-4 h-4" /> AI Analytics Dashboard
            </Link>
          )}
        </nav>

        {/* Right User Actions */}
        <div className="flex items-center gap-3">
          <Link href="/tickets/new" className="px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-blue-500/20">
            <PlusCircle className="w-4 h-4" /> Submit AI Ticket
          </Link>

          {profile && (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200/80">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-800 block leading-tight">{profile.display_name}</span>
                <span className="text-[10px] block font-medium">
                  {profile.user_type === "intern" ? (
                    <span className="text-amber-700 font-bold bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-200">Intern</span>
                  ) : (
                    <span className="text-slate-500">Staff ({profile.department})</span>
                  )}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
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

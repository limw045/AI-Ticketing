"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Ticket, HelpCircle, LayoutDashboard, LogOut, PlusCircle, Infinity } from "lucide-react";

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
    <header className="sticky top-0 z-50 bg-[#0a0a0c]/90 backdrop-blur-xl border-b border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Header */}
        <Link href="/tickets" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white bg-zinc-900 group-hover:border-blue-400 transition">
            <Infinity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight block">Get Blue</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-zinc-400 border border-white/10 bg-zinc-900">AI DESK</span>
            </div>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="flex items-center gap-6 text-xs font-mono text-zinc-400">
          <Link href="/tickets" className="hover:text-white transition flex items-center gap-1.5 font-medium">
            <Ticket className="w-3.5 h-3.5" /> Process
          </Link>
          <Link href="/faq" className="hover:text-white transition flex items-center gap-1.5 font-medium">
            <HelpCircle className="w-3.5 h-3.5" /> Difference
          </Link>
          {profile?.role && profile.role !== "employee" && (
            <Link href="/admin/dashboard" className="text-blue-400 hover:text-blue-300 transition flex items-center gap-1.5 font-semibold">
              <LayoutDashboard className="w-3.5 h-3.5" /> Analytics
            </Link>
          )}
        </nav>

        {/* Right User Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/tickets/new"
            className="px-5 py-2 rounded-full bg-[#6a9bcc]/90 hover:bg-[#6a9bcc] text-zinc-950 font-bold text-xs transition shadow-lg shadow-blue-500/10 flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Start Ticket
          </Link>

          {profile && (
            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              <div className="text-right">
                <span className="text-xs font-medium text-white block leading-tight">{profile.display_name}</span>
                <span className="text-[10px] font-mono text-zinc-500 block">
                  {profile.user_type === "intern" ? (
                    <span className="text-amber-400 font-bold">Intern</span>
                  ) : (
                    <span>Staff ({profile.department})</span>
                  )}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition"
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

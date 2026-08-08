"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Ticket, HelpCircle, LayoutDashboard, LogOut, PlusCircle, Infinity, Bell, Check } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const getProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("id, display_name, user_type, department, role").eq("id", user.id).single();
        if (data) setProfile(data);
        const { data: notificationData } = await supabase
          .from("notifications")
          .select("id, ticket_id, kind, title, body, read_at, created_at")
          .order("created_at", { ascending: false })
          .limit(10);
        setNotifications(notificationData ?? []);
      }
    };
    getProfile();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const openNotification = async (notification: any) => {
    const supabase = createClient();
    if (!notification.read_at) {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notification.id);
      if (!error) {
        setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
      }
    }
    setShowNotifications(false);
    if (notification.ticket_id) router.push(`/tickets/${notification.ticket_id}`);
  };

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

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

          {profile && <div className="relative">
            <button onClick={() => setShowNotifications((visible) => !visible)} aria-label={`${unreadCount} unread notifications`} className="relative rounded-full border border-white/10 bg-zinc-900 p-2 text-zinc-400 transition hover:text-white">
              <Bell className="h-3.5 w-3.5" />
              {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#6a9bcc] px-1 text-center text-[9px] font-bold leading-4 text-zinc-950">{unreadCount}</span>}
            </button>
            {showNotifications && <div className="absolute right-0 top-11 w-80 border border-white/10 bg-[#111113] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><strong className="editorial-mono text-[10px] uppercase tracking-widest text-zinc-400">Notifications</strong><span className="text-[10px] text-zinc-600">{unreadCount} unread</span></div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification) => <button key={notification.id} onClick={() => openNotification(notification)} className="flex w-full gap-3 border-b border-white/10 px-4 py-3 text-left hover:bg-white/[0.03]">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.read_at ? "bg-zinc-700" : "bg-[#6a9bcc]"}`} />
                  <span className="min-w-0"><strong className="block truncate text-xs text-white">{notification.title}</strong><span className="mt-1 block line-clamp-2 text-[11px] leading-4 text-zinc-500">{notification.body}</span></span>
                  {notification.read_at && <Check className="ml-auto h-3 w-3 shrink-0 text-zinc-700" />}
                </button>)}
                {notifications.length === 0 && <p className="px-4 py-6 text-center text-xs text-zinc-600">No notifications yet.</p>}
              </div>
            </div>}
          </div>}

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

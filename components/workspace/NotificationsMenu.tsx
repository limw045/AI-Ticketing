"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/cn";

export function NotificationsMenu() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getNotifications = async () => {
      const supabase = createClient();
      const { data: notificationData } = await supabase
        .from("notifications")
        .select("id, ticket_id, kind, title, body, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications(notificationData ?? []);
    };
    getNotifications();
  }, []);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const openNotification = async (notification: any) => {
    const supabase = createClient();
    if (!notification.read_at) {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notification.id);
      setNotifications((items) =>
        items.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
    }
    setOpen(false);
    if (notification.ticket_id) router.push(`/tickets/${notification.ticket_id}`);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--ink)]"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand)] px-1 font-mono text-[9px] font-bold text-[var(--brand-on)]">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Notifications
            </span>
            <span className="font-mono text-[10px] text-[var(--faint)]">
              {unreadCount} unread
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => openNotification(notification)}
                className={cn(
                  "flex w-full gap-3 border-b border-[var(--line)] px-4 py-3 text-left transition hover:bg-[var(--surface-2)]",
                  !notification.read_at && "bg-[var(--brand-soft)]/40"
                )}
              >
                <span
                  className={cn(
                    "mt-1 h-2 w-2 shrink-0 rounded-full",
                    notification.read_at
                      ? "bg-[var(--line-strong)]"
                      : "bg-[var(--brand)]"
                  )}
                />
                <span className="min-w-0">
                  <strong className="block truncate text-xs text-[var(--ink)]">
                    {notification.title}
                  </strong>
                  <span className="mt-1 block line-clamp-2 text-[11px] leading-4 text-[var(--muted)]">
                    {notification.body}
                  </span>
                </span>
                {notification.read_at && (
                  <Check className="ml-auto h-3 w-3 shrink-0 text-[var(--faint)]" />
                )}
              </button>
            ))}
            {notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-xs text-[var(--muted)]">
                No notifications yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

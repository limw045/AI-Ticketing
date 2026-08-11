"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import {
  mergeNotification,
  type WorkspaceNotification,
} from "@/lib/notifications";

export function NotificationsMenu() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  const getNotifications = useCallback(async () => {
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setError("Could not load notifications for the current account.");
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase
      .from("notifications")
      .select("id, ticket_id, kind, title, body, read_at, created_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (loadError) {
      setError(`Could not load notifications: ${loadError.message}`);
      setLoading(false);
      return;
    }
    setNotifications((data ?? []) as WorkspaceNotification[]);
    setError("");
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void getNotifications();
    const subscribe = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !user) {
        setError("Could not start live notifications.");
        return;
      }

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            const incoming = payload.new as WorkspaceNotification;
            setNotifications((items) => mergeNotification(items, incoming));
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setError("Live notifications are unavailable. Reopen this menu to refresh.");
          }
        });
    };
    void subscribe();

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [getNotifications, supabase]);

  useEffect(() => {
    const onFocus = () => void getNotifications();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [getNotifications]);

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

  const openNotification = async (notification: WorkspaceNotification) => {
    if (!notification.read_at) {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notification.id);
      if (updateError) {
        setError(`Could not mark notification as read: ${updateError.message}`);
        return;
      }
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
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) void getNotifications();
        }}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        className="topbar-action relative"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand)] px-1 font-mono text-[9px] font-bold text-[var(--brand-on)]">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Notifications
            </span>
            <span className="font-mono text-[10px] text-[var(--faint)]">
              {unreadCount} unread
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <PageSkeleton variant="notifications" />
            )}
            {error && (
              <div role="alert" className="border-b border-[var(--line)] bg-[var(--danger-soft)] px-4 py-3 text-xs text-[var(--danger)]">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => void getNotifications()}
                  className="mt-2 font-semibold underline underline-offset-2"
                >
                  Retry
                </button>
              </div>
            )}
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
            {notifications.length === 0 && !error && !loading && (
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

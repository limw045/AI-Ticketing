"use client";

import { useEffect } from "react";

export function PortalSessionKeeper() {
  useEffect(() => {
    let busy = false;
    const check = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const response = await fetch("/auth/portal/refresh", { method: "POST", cache: "no-store" });
        if (response.ok && (await response.json()).refreshed) window.location.reload();
      } catch {
        // A transient network failure is retried by the next interval.
      } finally { busy = false; }
    };
    const timer = window.setInterval(() => { void check(); }, 60_000);
    document.addEventListener("visibilitychange", check);
    void check();
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, []);
  return null;
}

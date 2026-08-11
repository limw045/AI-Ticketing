export type PortalMode = "user" | "admin";

const STORAGE_KEY = "gt-portal";

export function getPortalMode(): PortalMode {
  if (typeof window === "undefined") return "admin";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "user" ? "user" : "admin";
  } catch {
    return "admin";
  }
}

export function setPortalMode(mode: PortalMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage can be unavailable; portal choice still navigates for this visit.
  }
}

export function isAdminPortalPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

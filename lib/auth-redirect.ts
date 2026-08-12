export function safeInternalNext(value: string | null | undefined, fallback = "/dashboard") {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function destinationForPortal(mode: "user" | "admin", requestedNext: string | null | undefined) {
  const next = safeInternalNext(requestedNext, mode === "admin" ? "/admin/dashboard" : "/dashboard");
  if (mode === "user" && (next === "/admin" || next.startsWith("/admin/"))) return "/dashboard";
  return next;
}

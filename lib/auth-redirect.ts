export function safeInternalNext(value: string | null | undefined, fallback = "/dashboard") {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    && !/[\r\n]/.test(value) ? value : fallback;
}

export function destinationForPortal(mode: "user" | "admin", requestedNext: string | null | undefined) {
  const next = safeInternalNext(requestedNext, mode === "admin" ? "/admin/dashboard" : "/dashboard");
  if (mode === "user" && (next === "/admin" || next.startsWith("/admin/"))) return "/dashboard";
  return next;
}

export function isKnowledgeDestination(value: string | null | undefined) {
  const next = safeInternalNext(value, "");
  return next === "/faq" || next.startsWith("/faq?");
}

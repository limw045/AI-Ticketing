export type CommentSenderLabel = "Admin" | "Staff" | "System" | "Unknown role";

export function commentSenderLabel({
  role,
  type,
  isInternalNote,
}: {
  role?: string | null;
  type?: string | null;
  isInternalNote?: boolean;
}): CommentSenderLabel {
  if (type === "system_audit") return "System";
  // Internal notes are restricted to administrators by the database policy.
  if (isInternalNote) return "Admin";
  if (role === "admin" || role === "super_admin") return "Admin";
  if (role === "employee") return "Staff";
  return "Unknown role";
}

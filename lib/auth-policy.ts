export type AccountType = "full_time" | "intern";

const STAFF_EMAIL = /^[^@\s]+@gtmsw\.com\.my$/i;
const INTERN_EMAIL = /^[^@\s]+@outlook\.com$/i;
const RESERVED_ADMIN_EMAILS = new Set(["lim.weijian@outlook.com"]);

export function isReservedAdminEmail(email: string): boolean {
  return RESERVED_ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export function classifyAccountEmail(email: string): AccountType | null {
  const normalized = email.trim().toLowerCase();
  if (isReservedAdminEmail(normalized)) return "full_time";
  if (STAFF_EMAIL.test(normalized)) return "full_time";
  if (INTERN_EMAIL.test(normalized)) return "intern";
  return null;
}

export function validateRegistration(input: {
  email: string;
  displayName: string;
  department: string;
  supervisor?: string;
}) {
  const accountType = classifyAccountEmail(input.email);
  if (!accountType) {
    return { valid: false as const, error: "Only @gtmsw.com.my and @outlook.com accounts can join this desk." };
  }
  if (!input.displayName.trim()) {
    return { valid: false as const, error: "Full name is required." };
  }
  if (!input.department.trim()) {
    return { valid: false as const, error: "Department is required." };
  }
  if (accountType === "intern" && !input.supervisor?.trim()) {
    return { valid: false as const, error: "Interns must specify a supervisor." };
  }
  return { valid: true as const, accountType };
}

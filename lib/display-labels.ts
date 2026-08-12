const LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "P0 Urgent",
  employee: "Employee",
  admin: "Admin",
  super_admin: "Super Admin",
  full_time: "Full-time",
  intern: "Intern",
  contractor: "Contractor",
  active: "Active",
  suspended: "Suspended",
};

export function displayLabel(value: string | null | undefined, fallback = "—") {
  if (!value) return fallback;
  return LABELS[value] ?? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const ticketStatusLabel = displayLabel;
export const priorityLabel = displayLabel;
export const roleLabel = displayLabel;
export const accountTypeLabel = displayLabel;
export const accountStatusLabel = displayLabel;

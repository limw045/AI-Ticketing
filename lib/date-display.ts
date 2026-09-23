const DISPLAY_TIME_ZONE = "Asia/Kuala_Lumpur";

function validDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateParts(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")} ${part("month")} ${part("year")}`;
}

function timePart(date: Date, withSeconds: boolean): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hourCycle: "h23",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = validDate(value);
  if (!date) return "—";
  return dateParts(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = validDate(value);
  if (!date) return "—";
  return `${dateParts(date)}, ${timePart(date, false)}`;
}

export function formatAuditTime(value: string | Date | null | undefined): string {
  const date = validDate(value);
  if (!date) return "—";
  return `${dateParts(date)}, ${timePart(date, true)} MYT`;
}

export function formatDateFilter(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

export function parseDateFilter(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

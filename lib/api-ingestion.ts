export const MAX_SYSTEM_LOG_CHARS = 50_000;

const SENSITIVE_KEY = /password|passwd|secret|api[_-]?key|token|authorization/i;

function redactString(value: string) {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/\b(password|passwd|secret|api[_-]?key|(?:access|refresh)[_-]?token|token)\s*[:=]\s*([^\s,;]+)/gi, "$1=[REDACTED]");
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactValue(nested),
      ])
    );
  }
  return value;
}

export function sanitizeSystemLogs(value: unknown): unknown {
  const redacted = redactValue(value);
  if (typeof redacted === "string") {
    return redacted.length > MAX_SYSTEM_LOG_CHARS
      ? `${redacted.slice(0, MAX_SYSTEM_LOG_CHARS)}\n...[Truncated logs over 50KB]`
      : redacted;
  }

  if (redacted !== null && typeof redacted === "object") {
    const serialized = JSON.stringify(redacted);
    return serialized.length > MAX_SYSTEM_LOG_CHARS
      ? { _truncated: true, preview: serialized.slice(0, MAX_SYSTEM_LOG_CHARS) }
      : redacted;
  }

  return redacted ?? null;
}

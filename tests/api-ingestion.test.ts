import { describe, expect, it } from "vitest";
import { MAX_SYSTEM_LOG_CHARS, sanitizeSystemLogs } from "../lib/api-ingestion";

describe("sanitizeSystemLogs", () => {
  it("preserves ordinary strings and objects", () => {
    expect(sanitizeSystemLogs("short log")).toBe("short log");
    expect(sanitizeSystemLogs({ error: "timeout" })).toEqual({ error: "timeout" });
  });

  it("redacts secrets in text and nested objects", () => {
    expect(sanitizeSystemLogs("Authorization: Bearer abc.def password=hunter2")).toBe(
      "Authorization: Bearer [REDACTED] password=[REDACTED]"
    );
    expect(sanitizeSystemLogs({ request: { api_key: "secret", message: "token=abc" } })).toEqual({
      request: { api_key: "[REDACTED]", message: "token=[REDACTED]" },
    });
  });

  it("truncates oversized strings", () => {
    const result = sanitizeSystemLogs("x".repeat(MAX_SYSTEM_LOG_CHARS + 10));
    expect(result).toBe(`${"x".repeat(MAX_SYSTEM_LOG_CHARS)}\n...[Truncated logs over 50KB]`);
  });

  it("truncates oversized serialized objects", () => {
    const result = sanitizeSystemLogs({ log: "x".repeat(MAX_SYSTEM_LOG_CHARS) });
    expect(result).toMatchObject({ _truncated: true });
    expect((result as { preview: string }).preview).toHaveLength(MAX_SYSTEM_LOG_CHARS);
  });
});

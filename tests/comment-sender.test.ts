import { describe, expect, it } from "vitest";
import { commentSenderLabel } from "../lib/comment-sender";

describe("ticket conversation sender labels", () => {
  it("distinguishes staff from administrators even when names match", () => {
    expect(commentSenderLabel({ role: "employee" })).toBe("Staff");
    expect(commentSenderLabel({ role: "admin" })).toBe("Admin");
    expect(commentSenderLabel({ role: "super_admin" })).toBe("Admin");
  });

  it("does not guess a public sender's role when the profile is unavailable", () => {
    expect(commentSenderLabel({ role: null })).toBe("Unknown role");
    expect(commentSenderLabel({ role: null, isInternalNote: true })).toBe("Admin");
    expect(commentSenderLabel({ role: "employee", isInternalNote: true })).toBe("Admin");
    expect(commentSenderLabel({ role: null, type: "system_audit" })).toBe("System");
  });
});

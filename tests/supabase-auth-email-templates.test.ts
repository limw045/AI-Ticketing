import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readTemplate = (name: string) =>
  readFileSync(
    new URL(`../supabase/templates/${name}.html`, import.meta.url),
    "utf8"
  );

describe("Supabase Auth email templates", () => {
  it("implements the approved Confirm Signup content and variables", () => {
    const html = readTemplate("confirmation");

    expect(html).toContain("Confirm your email address");
    expect(html).toContain(
      "Thank you for registering for the Internal Ticketing System."
    );
    expect(html).toContain("Confirm email");
    expect(html).toContain("No account access will be granted.");
    expect(html.match(/{{ \.ConfirmationURL }}/g)).toHaveLength(3);
  });

  it("implements the approved Reset Password content and variables", () => {
    const html = readTemplate("recovery");

    expect(html).toContain("Reset your password");
    expect(html).toContain("We received a request to reset the password");
    expect(html).toContain("Reset password");
    expect(html).toContain("Your current password will remain unchanged.");
    expect(html.match(/{{ \.ConfirmationURL }}/g)).toHaveLength(3);
  });

  it("keeps both templates personalized, email-safe, and consistently branded", () => {
    for (const name of ["confirmation", "recovery"]) {
      const html = readTemplate(name);

      expect(html).toContain("{{ if .Data.display_name }}");
      expect(html).toContain("Hello {{ .Data.display_name }},");
      expect(html).toContain("{{ else }}Hello,{{ end }}");
      expect(html).toContain('role="presentation"');
      expect(html).toContain("Grant Thornton");
      expect(html).toContain("AI Department");
      expect(html).toContain("#5c2d91");
      expect(html).toContain(
        "Grant Thornton Malaysia · Confidential system email"
      );
      expect(html).toContain(
        "This is an automated message. Please do not reply."
      );
      expect(html).not.toMatch(/<script|<link|var\(--|@font-face/i);
      expect(html).not.toContain("| default");
    }
  });
});

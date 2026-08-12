import { describe, expect, it } from "vitest";
import { firstTicketSubmissionError, hasSubstantiveTemplateInput, validateTicketSubmission } from "../lib/ticket-submission";

const valid = { title: "Cannot open client file", category: "Common Problem", priority: "medium", description: "Steps:\nI open client 42 and receive error 500.", template: "Steps:", impact: "", p0Confirmed: false };

describe("ticket submission validation", () => {
  it("requires an explicit category and substantive template input", () => {
    expect(hasSubstantiveTemplateInput("Steps:\n", "Steps:\n")).toBe(false);
    const errors = validateTicketSubmission({ ...valid, category: "", description: "Steps:\n" });
    expect(errors.category).toBeTruthy();
    expect(errors.description).toBeTruthy();
  });

  it("does not treat metadata-only changes as substantive text", () => {
    expect(hasSubstantiveTemplateInput("Steps:\n", "Steps:")).toBe(false);
  });

  it("requires P0 impact and confirmation", () => {
    const errors = validateTicketSubmission({ ...valid, priority: "urgent", impact: "blocked", p0Confirmed: false });
    expect(errors.impact).toBeTruthy();
    expect(errors.p0Confirmed).toBeTruthy();
  });

  it("returns the first field in visual order", () => {
    expect(firstTicketSubmissionError(validateTicketSubmission({ ...valid, title: "", category: "" }))).toBe("title");
  });
});

export type TicketSubmissionInput = {
  title: string;
  category: string;
  priority: string;
  description: string;
  template: string;
  impact: string;
  p0Confirmed: boolean;
};

export type TicketSubmissionErrors = Partial<Record<"title" | "category" | "description" | "impact" | "p0Confirmed", string>>;

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

export function hasSubstantiveTemplateInput(description: string, template: string) {
  const normalizedDescription = normalize(description);
  const normalizedTemplate = normalize(template);
  if (!normalizedDescription || normalizedDescription === normalizedTemplate) return false;
  const userText = normalizedTemplate ? normalizedDescription.replace(normalizedTemplate, "").trim() : normalizedDescription;
  return userText.length >= 12;
}

export function validateTicketSubmission(input: TicketSubmissionInput): TicketSubmissionErrors {
  const errors: TicketSubmissionErrors = {};
  if (input.title.trim().length < 5) errors.title = "Use at least 5 characters so the request is recognizable.";
  if (!input.category) errors.category = "Select the category that best matches this request.";
  if (!hasSubstantiveTemplateInput(input.description, input.template)) errors.description = "Replace or complete the guidance with specific details about your request.";
  if (input.priority === "urgent") {
    if (input.impact.trim().length < 20) errors.impact = "Explain who is affected and what work is blocked (at least 20 characters).";
    if (!input.p0Confirmed) errors.p0Confirmed = "Confirm that this is a business-critical P0 incident.";
  }
  return errors;
}

export const firstTicketSubmissionError = (errors: TicketSubmissionErrors) =>
  (["title", "category", "description", "impact", "p0Confirmed"] as const).find((field) => errors[field]);

import { describe, expect, it } from "vitest";
import { normalizeCategoryRuleInput } from "../lib/admin/category-rule-input";

describe("category rule optional assignee", () => {
  it.each(["", "   "])("saves an unassigned category when the form sends %j", (value) => {
    expect(normalizeCategoryRuleInput({ category_name: "RiskScreen", template_markdown: "## Issue", default_assignee_id: value }))
      .toEqual({ category_name: "RiskScreen", template_markdown: "## Issue", default_assignee_id: null });
  });
  it("preserves supplied assignees and omitted fields", () => {
    const id = "164b1a2e-8ed8-4732-bd0b-c1fad46cc806";
    expect(normalizeCategoryRuleInput({ default_assignee_id: id }).default_assignee_id).toBe(id);
    expect(normalizeCategoryRuleInput({ category_name: "General" })).not.toHaveProperty("default_assignee_id");
  });
});

import { describe, expect, it } from "vitest";
import {
  getHistoricalCategoryOptions,
  resolveDefaultCategory,
  sortCategoryRules,
  type CategoryRule,
} from "../lib/ticket-categories";

const rule = (category_name: string, template_markdown = ""):
  CategoryRule => ({ id: category_name, category_name, template_markdown });

describe("ticket category rules", () => {
  it("places Risk Screen first and sorts remaining active rules", () => {
    expect(
      sortCategoryRules([
        rule("Workflow Failure"),
        rule("Risk Screen"),
        rule("Common Problem"),
      ]).map((item) => item.category_name)
    ).toEqual(["Risk Screen", "Common Problem", "Workflow Failure"]);
  });

  it("resolves Risk Screen or falls back to the first available category", () => {
    expect(resolveDefaultCategory([rule("Common Problem"), rule("Risk Screen")]))
      .toBe("Risk Screen");
    expect(resolveDefaultCategory([rule("Workflow Failure"), rule("Common Problem")]))
      .toBe("Common Problem");
    expect(resolveDefaultCategory([])).toBeNull();
  });

  it("keeps every category represented by historical ticket data", () => {
    expect(
      getHistoricalCategoryOptions([
        { category: "System Bug" },
        { category: "Risk Screen" },
        { category: "System Bug" },
        { category: "" },
      ])
    ).toEqual(["Risk Screen", "System Bug"]);
  });
});

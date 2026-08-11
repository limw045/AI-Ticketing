export interface CategoryRule {
  id: string;
  category_name: string;
  template_markdown: string | null;
  default_assignee_id?: string | null;
}

export const PREFERRED_DEFAULT_CATEGORY = "Risk Screen";

export function sortCategoryRules(rules: CategoryRule[]): CategoryRule[] {
  return [...rules].sort((left, right) => {
    if (left.category_name === PREFERRED_DEFAULT_CATEGORY) return -1;
    if (right.category_name === PREFERRED_DEFAULT_CATEGORY) return 1;
    return left.category_name.localeCompare(right.category_name);
  });
}

export function resolveDefaultCategory(rules: CategoryRule[]): string | null {
  return sortCategoryRules(rules)[0]?.category_name ?? null;
}

export function getHistoricalCategoryOptions(
  tickets: Array<{ category?: string | null }>
): string[] {
  return [...new Set(
    tickets
      .map((ticket) => ticket.category?.trim())
      .filter((category): category is string => Boolean(category))
  )].sort((left, right) => left.localeCompare(right));
}

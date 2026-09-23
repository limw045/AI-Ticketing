export function normalizeCategoryRuleInput(data: Record<string, unknown>) {
  if (typeof data.default_assignee_id !== "string") return data;
  return {
    ...data,
    default_assignee_id: data.default_assignee_id.trim() || null,
  };
}

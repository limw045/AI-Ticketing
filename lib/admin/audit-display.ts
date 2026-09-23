export function auditActionLabel(action: string): string {
  switch (action.toLowerCase()) {
    case "insert": return "Created";
    case "update": return "Updated";
    case "delete": return "Deleted";
    default: return readableField(action);
  }
}

export function readableField(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/^./, (first) => first.toUpperCase());
}

export function shortRecordId(id: string): string {
  return id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export function auditTarget(row: { entity_id?: string | null; changed_fields?: Record<string, unknown> | null }): string {
  const fields = row.changed_fields ?? {};
  for (const key of ["title", "display_name", "category_name", "question", "name", "email"]) {
    if (typeof fields[key] === "string" && fields[key]) return String(fields[key]);
  }
  return row.entity_id ? shortRecordId(row.entity_id) : "Record";
}

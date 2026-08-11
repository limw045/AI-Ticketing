export interface WorkspaceNotification {
  id: string;
  ticket_id: string | null;
  kind: "new_ticket" | "comment" | "status" | "assignment";
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export function mergeNotification(
  current: WorkspaceNotification[],
  incoming: WorkspaceNotification,
  limit = 20
) {
  return [incoming, ...current.filter((item) => item.id !== incoming.id)]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

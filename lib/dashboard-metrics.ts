export interface RoleMetrics {
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  urgentCount: number;
  unassignedCount: number;
  myOpenCount: number;
  waitingOnCount: number;
  totalVolume: number;
  resolutionRate: number;
  hasResolutionSample: boolean;
  activeIncidents: number;
}

export function getRoleHomeMetrics(
  tickets: any[],
  currentUserId?: string
): RoleMetrics {
  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  ).length;
  const urgentCount = tickets.filter(
    (t) => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed"
  ).length;
  const unassignedCount = tickets.filter(
    (t) => t.status !== "closed" && !t.assignee_id
  ).length;
  const myOpenCount = tickets.filter(
    (t) => t.author_id === currentUserId && t.status !== "closed"
  ).length;
  const waitingOnCount = tickets.filter(
    (t) => t.author_id === currentUserId && t.status === "in_progress"
  ).length;
  const totalVolume = tickets.length;
  const hasResolutionSample = totalVolume > 0;
  const resolutionRate =
    totalVolume > 0 ? Math.round((resolvedCount / totalVolume) * 100) : 0;
  const activeIncidents = tickets.filter((t) => t.is_active).length;

  return {
    openCount,
    inProgressCount,
    resolvedCount,
    urgentCount,
    unassignedCount,
    myOpenCount,
    waitingOnCount,
    totalVolume,
    resolutionRate,
    hasResolutionSample,
    activeIncidents,
  };
}

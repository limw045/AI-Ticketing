import { describe, expect, it } from "vitest";
import { getRoleHomeMetrics } from "../lib/dashboard-metrics";

const baseTickets = [
  { status: "open", priority: "medium", author_id: "user-a", assignee_id: null, is_active: true },
  { status: "in_progress", priority: "high", author_id: "user-b", assignee_id: "agent-1", is_active: true },
  { status: "resolved", priority: "low", author_id: "user-a", assignee_id: "agent-1", is_active: false },
  { status: "closed", priority: "urgent", author_id: "user-c", assignee_id: null, is_active: false },
  { status: "open", priority: "urgent", author_id: "user-a", assignee_id: null, is_active: true },
];

describe("getRoleHomeMetrics", () => {
  it("counts status and priority buckets across the queue", () => {
    const metrics = getRoleHomeMetrics(baseTickets);
    expect(metrics.openCount).toBe(2);
    expect(metrics.inProgressCount).toBe(1);
    expect(metrics.resolvedCount).toBe(2);
    expect(metrics.urgentCount).toBe(1);
    expect(metrics.totalVolume).toBe(5);
    expect(metrics.resolutionRate).toBe(40);
  });

  it("computes my-open and waiting counts for the current user", () => {
    const metrics = getRoleHomeMetrics(baseTickets, "user-a");
    expect(metrics.myOpenCount).toBe(3);
    expect(metrics.waitingOnCount).toBe(0);
  });

  it("counts unassigned open work for support agents", () => {
    const metrics = getRoleHomeMetrics(baseTickets);
    expect(metrics.unassignedCount).toBe(2);
  });

  it("handles an empty queue without dividing by zero", () => {
    const metrics = getRoleHomeMetrics([], "user-a");
    expect(metrics).toEqual({
      openCount: 0,
      inProgressCount: 0,
      resolvedCount: 0,
      urgentCount: 0,
      unassignedCount: 0,
      myOpenCount: 0,
      waitingOnCount: 0,
      totalVolume: 0,
      resolutionRate: 0,
      hasResolutionSample: false,
      activeIncidents: 0,
    });
  });

  it("marks a non-empty queue as a valid resolution sample", () => {
    expect(getRoleHomeMetrics(baseTickets, "user-a").hasResolutionSample).toBe(true);
  });
});

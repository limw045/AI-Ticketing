import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  booleanToIncidentStatus,
  buildIncidentListParams,
  clampIncidentPage,
  incidentStatusToBoolean,
  readIncidentPageSize,
} from "../lib/admin/incident-view";

const incidentsPage = readFileSync(
  new URL("../components/admin/IncidentsAdminPage.tsx", import.meta.url),
  "utf8"
);

describe("incident administration status mapping", () => {
  it("maps form status values to the existing boolean database field", () => {
    expect(incidentStatusToBoolean("active")).toBe(true);
    expect(incidentStatusToBoolean("resolved")).toBe(false);
    expect(booleanToIncidentStatus(true)).toBe("active");
    expect(booleanToIncidentStatus(false)).toBe("resolved");
  });

  it("builds separate active and resolved list queries with shared filters", () => {
    const shared = {
      q: "database",
      severity: "critical",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-12",
      deleted: false,
      page: 2,
      pageSize: 50 as const,
    };
    const active = buildIncidentListParams({ ...shared, status: "active" });
    const resolved = buildIncidentListParams({ ...shared, status: "resolved" });

    expect(active.get("filter.is_active")).toBe("true");
    expect(resolved.get("filter.is_active")).toBe("false");
    expect(active.get("filter.severity")).toBe("critical");
    expect(active.get("q")).toBe("database");
    expect(active.get("page")).toBe("2");
    expect(active.get("pageSize")).toBe("50");
  });

  it("does not status-filter the single deleted-records query", () => {
    const params = buildIncidentListParams({
      q: "",
      severity: "all",
      dateFrom: "",
      dateTo: "",
      deleted: true,
      status: "active",
      page: 1,
      pageSize: 25,
    });

    expect(params.get("deleted")).toBe("true");
    expect(params.has("filter.is_active")).toBe(false);
    expect(params.has("filter.severity")).toBe(false);
  });
});

describe("incident section pagination", () => {
  it("accepts only supported page sizes", () => {
    expect(readIncidentPageSize("50")).toBe(50);
    expect(readIncidentPageSize("100")).toBe(100);
    expect(readIncidentPageSize("10")).toBe(25);
    expect(readIncidentPageSize(null)).toBe(25);
  });

  it("returns the last valid page after rows move between sections", () => {
    expect(clampIncidentPage(3, 49, 25)).toBe(2);
    expect(clampIncidentPage(2, 0, 25)).toBe(1);
    expect(clampIncidentPage(0, 100, 25)).toBe(1);
  });
});

describe("incident administration page contract", () => {
  it("renders active incidents above resolved incidents", () => {
    expect(incidentsPage.indexOf('title="Active incidents"')).toBeGreaterThan(-1);
    expect(incidentsPage.indexOf('title="Resolved incidents"')).toBeGreaterThan(
      incidentsPage.indexOf('title="Active incidents"')
    );
  });

  it("uses a human-readable status select in the add and edit form", () => {
    expect(incidentsPage).toContain("<FieldLabel>Status</FieldLabel>");
    expect(incidentsPage).toContain('<option value="active">Active</option>');
    expect(incidentsPage).toContain('<option value="resolved">Resolved</option>');
    expect(incidentsPage).not.toContain("Publish immediately");
  });

  it("keeps deleted incidents in one section", () => {
    expect(incidentsPage).toContain('title="Deleted incidents"');
    expect(incidentsPage).not.toContain("All status");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const charts = readFileSync(
  new URL("../components/dashboard/DashboardCharts.tsx", import.meta.url),
  "utf8"
);
const page = readFileSync(
  new URL("../app/(workspace)/admin/dashboard/page.tsx", import.meta.url),
  "utf8"
);

describe("dashboard chart cards", () => {
  it("uses accessible date menus with menu semantics", () => {
    expect(charts).toContain('aria-haspopup="menu"');
    expect(charts).toContain("aria-expanded={open}");
    expect(charts).toContain('role="menu"');
    expect(charts).toContain("aria-checked={p === preset}");
    expect(charts).toContain('role="menuitemradio"');
  });

  it("renders a real department checkbox list with select-all recovery", () => {
    expect(charts).toContain('type="checkbox"');
    expect(charts).toContain("Select all");
    expect(charts).toContain("accent-[var(--brand)]");
  });

  it("keeps the filtered CSV download and report links", () => {
    expect(charts).toContain("link.download = `departments-");
    expect(charts).toContain("/admin/tickets?range=");
    expect(charts).toContain("Ticket report");
    expect(charts).toContain("Department report");
  });

  it("stays on Recharts with no new chart dependencies", () => {
    expect(charts).toContain('from "recharts"');
    expect(charts).not.toContain("apexcharts");
    expect(charts).not.toContain("flowbite");
  });

  it("is wired into the admin dashboard page", () => {
    expect(page).toContain(
      'import DashboardCharts from "@/components/dashboard/DashboardCharts"'
    );
    expect(page).toContain("<DashboardCharts tickets={tickets} />");
  });
});

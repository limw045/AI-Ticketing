import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260811030000_ticket_comment_lifecycle_and_incident_realtime.sql",
    import.meta.url
  ),
  "utf8"
);
const incidentBanner = readFileSync(
  new URL("../components/IncidentBanner.tsx", import.meta.url),
  "utf8"
);
const workspaceShell = readFileSync(
  new URL("../components/workspace/WorkspaceShell.tsx", import.meta.url),
  "utf8"
);
const ticketsPage = readFileSync(
  new URL("../app/(workspace)/tickets/page.tsx", import.meta.url),
  "utf8"
);
const newTicketPage = readFileSync(
  new URL("../app/(workspace)/tickets/new/page.tsx", import.meta.url),
  "utf8"
);
const dashboardPage = readFileSync(
  new URL("../app/(workspace)/dashboard/page.tsx", import.meta.url),
  "utf8"
);
const globalCss = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8"
);

describe("ticket comment lifecycle", () => {
  it("backfills comments that belong to already-deleted tickets", () => {
    expect(migration).toContain("UPDATE public.comments comment");
    expect(migration).toContain("comment.ticket_id = ticket.id");
    expect(migration).toContain("ticket.deleted_at IS NOT NULL");
    expect(migration).toContain("comment.deleted_at IS NULL");
  });

  it("cascades soft deletion and only restores comments from the same lifecycle", () => {
    expect(migration).toContain("IF p_resource = 'tickets' THEN");
    expect(migration).toContain("WHERE ticket_id = p_record_id AND deleted_at IS NULL");
    expect(migration).toContain("deleted_at = lifecycle_at");
    expect(migration).toContain(
      "deleted_by IS NOT DISTINCT FROM lifecycle_actor"
    );
  });
});

describe("global incident marquee", () => {
  it("renders once in the workspace shell instead of individual ticket pages", () => {
    expect(workspaceShell).toContain("<IncidentBanner canManage={isAdmin} />");
    expect(ticketsPage).not.toContain("IncidentBanner");
    expect(newTicketPage).not.toContain("IncidentBanner");
    expect(dashboardPage).not.toContain("incidents[0]");
  });

  it("updates through Realtime and exposes an accessible moving rail", () => {
    expect(migration).toContain(
      "ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents"
    );
    expect(incidentBanner).toContain('table: "incidents"');
    expect(incidentBanner).toContain('aria-label="Active incidents"');
    expect(incidentBanner).toContain("incident-marquee-track");
    expect(incidentBanner).toContain('href="/admin/incidents"');
  });

  it("pauses on hover and disables movement for reduced-motion users", () => {
    expect(globalCss).toContain("@keyframes incident-marquee");
    expect(globalCss).toContain("animation-play-state: paused");
    expect(globalCss).toContain("animation: none !important");
  });

  it("centers all incident rail regions without changing marquee behavior", () => {
    expect(incidentBanner).toContain(
      'className="incident-marquee flex min-w-0 flex-1 items-center"'
    );
    expect(incidentBanner).toContain(
      "flex shrink-0 items-center gap-1.5"
    );
    expect(globalCss).toContain("height: 100%");
    expect(globalCss).toContain("animation: incident-marquee 28s linear infinite");
  });
});

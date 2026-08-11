import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  mergeNotification,
  type WorkspaceNotification,
} from "../lib/notifications";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260811020000_ticket_workflow_reliability.sql",
    import.meta.url
  ),
  "utf8"
);
const ticketPage = readFileSync(
  new URL("../app/(workspace)/tickets/[id]/page.tsx", import.meta.url),
  "utf8"
);
const adminServer = readFileSync(
  new URL("../lib/admin/server.ts", import.meta.url),
  "utf8"
);
const notificationsMenu = readFileSync(
  new URL("../components/workspace/NotificationsMenu.tsx", import.meta.url),
  "utf8"
);

function notification(
  id: string,
  createdAt: string,
  readAt: string | null = null
): WorkspaceNotification {
  return {
    id,
    ticket_id: "ticket-id",
    kind: "new_ticket",
    title: id,
    body: id,
    read_at: readAt,
    created_at: createdAt,
  };
}

describe("ticket workflow reliability migration", () => {
  it("exposes RLS-aware views instead of ambiguous relationship embeds", () => {
    expect(migration).toContain("CREATE OR REPLACE VIEW public.comment_details");
    expect(migration).toContain("CREATE OR REPLACE VIEW public.category_rule_details");
    expect(migration.match(/security_invoker = true/g)).toHaveLength(2);
    expect(migration).toContain("REVOKE ALL ON public.comment_details FROM PUBLIC, anon");
    expect(migration).toContain("GRANT SELECT ON public.category_rule_details TO authenticated");
    expect(ticketPage).toContain('.from("comment_details")');
    expect(ticketPage).not.toContain('author:profiles(*)');
    expect(adminServer).toContain('comments: "comment_details"');
    expect(adminServer).toContain('"category-rules": "category_rule_details"');
  });

  it("persists the agreed notification routes and enables Realtime", () => {
    expect(migration).toContain("p.role IN ('admin', 'super_admin')");
    expect(migration).toContain("p.id IS DISTINCT FROM NEW.author_id");
    expect(migration).toContain("NEW.assignee_id IS NULL");
    expect(migration).toContain("IF NEW.is_internal_note THEN RETURN NEW; END IF;");
    expect(migration).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications");
    expect(notificationsMenu).toContain('"postgres_changes"');
    expect(notificationsMenu).toContain("filter: `recipient_id=eq.${user.id}`");
    expect(notificationsMenu).toContain('.eq("recipient_id", user.id)');
  });

  it("shows explicit comment progress and the compact accessible checklist", () => {
    expect(ticketPage).toContain("Submitting…");
    expect(ticketPage).toContain("Reply posted.");
    expect(ticketPage).toContain("Reply saved, but the discussion could not refresh");
    expect(ticketPage).toContain("No sub-tasks yet.");
    expect(ticketPage).toContain('aria-label="Add sub-task"');
  });
});

describe("mergeNotification", () => {
  it("deduplicates an event and keeps the newest notification first", () => {
    const existing = [
      notification("old", "2026-08-11T01:00:00.000Z"),
      notification("same", "2026-08-11T02:00:00.000Z"),
    ];
    const incoming = notification("same", "2026-08-11T03:00:00.000Z");

    expect(mergeNotification(existing, incoming).map((item) => item.id)).toEqual([
      "same",
      "old",
    ]);
  });

  it("caps the retained notification history", () => {
    const existing = Array.from({ length: 20 }, (_, index) =>
      notification(
        `notification-${index}`,
        new Date(Date.UTC(2026, 7, 11, 0, index)).toISOString()
      )
    );
    const result = mergeNotification(
      existing,
      notification("newest", "2026-08-11T05:00:00.000Z")
    );

    expect(result).toHaveLength(20);
    expect(result[0].id).toBe("newest");
  });
});

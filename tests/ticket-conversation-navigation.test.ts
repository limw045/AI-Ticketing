import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminPage = readFileSync("app/(workspace)/admin/tickets/page.tsx", "utf8");
const detailPage = readFileSync("app/(workspace)/tickets/[id]/page.tsx", "utf8");

describe("ticket conversation navigation", () => {
  it("offers an explicit conversation action for both desktop rows and mobile details", () => {
    expect(adminPage.match(/href=\{`\/tickets\/\$\{ticket.id\}#conversation`\}/g)).toHaveLength(2);
    expect(adminPage).toContain('setPortalMode("admin")');
    expect(detailPage).toContain('id="conversation"');
  });
  it("keeps conversation above the case path and checklist on desktop", () => {
    expect(detailPage.indexOf('id="conversation"')).toBeLessThan(detailPage.indexOf('{/* Case path lifecycle */}'));
    expect(detailPage).toContain('useState<"conversation" | "details">("conversation")');
  });
  it("uses the structured checklist instead of exposing raw JSON for editing", () => {
    expect(adminPage).toContain("<SubtaskEditor");
    expect(adminPage).not.toContain("subtasksText");
    expect(adminPage).not.toContain("Subtasks JSON");
    expect(adminPage).toContain("expectedUpdatedAt: editing.updated_at");
    expect(adminPage).toContain("...task, title: task.title.trim()");
  });
  it("refreshes through the permission-filtered discussion query rather than displaying raw realtime payloads", () => {
    expect(detailPage).toContain("await loadComments(canManageTicket)");
    expect(detailPage).toContain('commentQuery.eq("is_internal_note", false)');
    expect(detailPage).toContain("window.clearInterval(timer)");
    expect(detailPage).toContain("supabase.removeChannel(channel)");
  });
});

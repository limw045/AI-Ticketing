import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("shared mobile interaction foundation", () => {
  const sheet = read("components/ui/ResponsiveSheet.tsx");
  const fields = read("components/ui/FormField.tsx");
  const shell = read("components/workspace/WorkspaceShell.tsx");
  const css = read("app/globals.css");

  it("provides an accessible, safe-area-aware modal sheet", () => {
    expect(sheet).toContain('role="dialog"');
    expect(sheet).toContain('aria-modal="true"');
    expect(sheet).toContain('event.key === "Escape"');
    expect(sheet).toContain('event.key !== "Tab"');
    expect(sheet).toContain('document.body.style.overflow = "hidden"');
    expect(sheet).toContain("safe-area-bottom");
  });

  it("keeps touch targets usable and prevents iOS input zoom", () => {
    expect(fields).toContain("min-h-11");
    expect(fields).toContain("text-base");
    expect(fields).toContain("sm:text-sm");
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*font-size: 16px/);
    expect(css).toContain("env(safe-area-inset-bottom)");
  });

  it("makes the mobile workspace drawer modal and viewport bounded", () => {
    expect(shell).toContain('aria-label="Workspace navigation"');
    expect(shell).toContain('aria-modal="true"');
    expect(shell).toContain("w-[min(290px,calc(100vw-3rem))]");
    expect(shell).toContain("drawerTrigger?.focus()");
    expect(shell).toContain("safe-area-top");
  });
});

describe("mobile ticket workflows", () => {
  const list = read("app/(workspace)/tickets/page.tsx");
  const detail = read("app/(workspace)/tickets/[id]/page.tsx");
  const create = read("app/(workspace)/tickets/new/page.tsx");

  it("moves queue filters into a sheet and uses explicit selection mode", () => {
    expect(list).toContain("<ResponsiveSheet");
    expect(list).toContain('title="Filter tickets"');
    expect(list).toContain("selectionMode");
    expect(list).toContain("Select tickets");
    expect(list).not.toContain("min-w-[280px]");
  });

  it("separates conversation and details on mobile without removing desktop content", () => {
    expect(detail).toContain('useState<"conversation" | "details">');
    expect(detail).toContain("Conversation ({comments.length})");
    expect(detail).toContain("mobileTab !== \"details\"");
    expect(detail).toContain("hidden lg:block");
  });

  it("keeps ticket submission above the mobile safe area", () => {
    expect(create).toContain("safe-area-bottom");
    expect(create).toContain("flex-1 sm:min-w-[150px]");
    expect(create).not.toContain('className="min-w-[150px]"');
  });
});

describe("responsive administration", () => {
  const table = read("components/admin/table.tsx");
  const crud = read("components/admin/SimpleCrudPage.tsx");
  const staff = read("components/admin/StaffManagement.tsx");
  const recycle = read("components/admin/RecycleBinClient.tsx");
  const tickets = read("app/(workspace)/admin/tickets/page.tsx");
  const clients = read("app/(workspace)/admin/api-clients/page.tsx");
  const logs = read("components/admin/ReadOnlyLogTable.tsx");

  it("supports mobile records while retaining a documented scroll fallback", () => {
    expect(table).toContain("mobile?: React.ReactNode");
    expect(table).toContain("export function AdminMobileList");
    expect(table).toContain("Swipe horizontally to view all columns");
    expect(table).toContain('title="Filter records"');
  });

  it("supplies mobile rows for every writable specialized collection", () => {
    for (const source of [crud, staff, recycle, tickets, clients]) {
      expect(source).toContain("<AdminMobileList");
    }
  });

  it("keeps immutable logs scrollable but moves filters into a sheet", () => {
    expect(logs).not.toContain("<AdminMobileList");
    expect(logs).toContain('title="Filter logs"');
    expect(logs).toContain("<ResponsiveSheet");
  });
});

import { describe, expect, it } from "vitest";
import {
  ADMIN_CONSOLE_ITEMS,
  NAV_ITEMS,
  getActiveNavHref,
} from "../components/workspace/nav-config";

describe("getActiveNavHref", () => {
  it("matches the exact path for top-level items", () => {
    expect(getActiveNavHref("/dashboard", NAV_ITEMS)).toBe("/dashboard");
    expect(getActiveNavHref("/tickets", NAV_ITEMS)).toBe("/tickets");
    expect(getActiveNavHref("/faq", NAV_ITEMS)).toBe("/faq");
  });

  it("highlights only the most specific item on nested paths", () => {
    expect(getActiveNavHref("/tickets/new", NAV_ITEMS)).toBe("/tickets/new");
    expect(getActiveNavHref("/tickets/abc-123", NAV_ITEMS)).toBe("/tickets");
  });

  it("respects path segment boundaries", () => {
    expect(getActiveNavHref("/tickets-new", NAV_ITEMS)).toBeNull();
  });

  it("returns null when no item matches", () => {
    expect(getActiveNavHref("/", NAV_ITEMS)).toBeNull();
    expect(getActiveNavHref("/unknown", NAV_ITEMS)).toBeNull();
  });

  it("does not depend on item order", () => {
    expect(getActiveNavHref("/tickets/new", [...NAV_ITEMS].reverse())).toBe(
      "/tickets/new"
    );
  });

  it("keeps admin console items independent of user items", () => {
    expect(getActiveNavHref("/admin/tickets", ADMIN_CONSOLE_ITEMS)).toBe(
      "/admin/tickets"
    );
    expect(getActiveNavHref("/tickets/new", ADMIN_CONSOLE_ITEMS)).toBeNull();
  });
});

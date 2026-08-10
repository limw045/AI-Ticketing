import { describe, expect, it } from "vitest";
import {
  canManageProfile,
  canManageRole,
  isAdminRole,
  normalizeAdminListQuery,
  sanitizeAdminSearch,
} from "../lib/admin/types";

describe("three-role administration", () => {
  it("recognizes only Admin and Super Admin as administrative roles", () => {
    expect(isAdminRole("employee")).toBe(false);
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("super_admin")).toBe(true);
    expect(isAdminRole("support_agent")).toBe(false);
  });

  it("lets Admin manage Employees but never another administrator", () => {
    expect(canManageProfile("admin", "employee")).toBe(true);
    expect(canManageProfile("admin", "admin")).toBe(false);
    expect(canManageProfile("admin", "super_admin")).toBe(false);
  });

  it("lets Super Admin manage other accounts but never itself", () => {
    expect(canManageProfile("super_admin", "employee")).toBe(true);
    expect(canManageProfile("super_admin", "admin")).toBe(true);
    expect(canManageProfile("super_admin", "super_admin")).toBe(true);
    expect(canManageProfile("super_admin", "admin", true)).toBe(false);
    expect(canManageRole("super_admin", false)).toBe(true);
    expect(canManageRole("super_admin", true)).toBe(false);
  });
});
describe("admin list query normalization", () => {
  it("uses stable paging defaults and clamps invalid input", () => {
    expect(normalizeAdminListQuery({ page: -4, pageSize: 99 as 25 })).toMatchObject({
      page: 1,
      pageSize: 25,
      direction: "desc",
    });
    expect(normalizeAdminListQuery({ page: 3, pageSize: 100, direction: "asc" })).toMatchObject({
      page: 3,
      pageSize: 100,
      direction: "asc",
    });
  });

  it("removes PostgREST control punctuation and caps search size", () => {
    expect(sanitizeAdminSearch("  finance,(admin)%  ")).toBe("finance  admin  ");
    expect(sanitizeAdminSearch("x".repeat(200))).toHaveLength(120);
  });
});

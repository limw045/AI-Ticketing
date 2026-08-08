import { describe, expect, it } from "vitest";
import { classifyAccountEmail, isReservedAdminEmail, validateRegistration } from "../lib/auth-policy";

describe("classifyAccountEmail", () => {
  it("recognizes staff and intern domains case-insensitively", () => {
    expect(classifyAccountEmail(" Staff@GTMSW.COM.MY ")).toBe("full_time");
    expect(classifyAccountEmail("intern@outlook.com")).toBe("intern");
  });

  it("rejects suffix lookalikes and unsupported public domains", () => {
    expect(classifyAccountEmail("person@evil-gtmsw.com.my")).toBeNull();
    expect(classifyAccountEmail("person@notoutlook.com")).toBeNull();
    expect(classifyAccountEmail("person@gmail.com")).toBeNull();
  });

  it("recognizes the reserved Outlook administrator as full-time without Intern metadata", () => {
    expect(isReservedAdminEmail(" LIM.WEIJIAN@OUTLOOK.COM ")).toBe(true);
    expect(classifyAccountEmail("lim.weijian@outlook.com")).toBe("full_time");
    expect(validateRegistration({
      email: "lim.weijian@outlook.com",
      displayName: "Lim Weijian",
      department: "AI Department",
    })).toEqual({ valid: true, accountType: "full_time" });
  });
});

describe("validateRegistration", () => {
  it("requires a supervisor for interns", () => {
    expect(validateRegistration({
      email: "intern@outlook.com",
      displayName: "Intern User",
      department: "Product",
      supervisor: "",
    })).toEqual({ valid: false, error: "Interns must specify a supervisor." });
  });

  it("accepts a complete staff registration", () => {
    expect(validateRegistration({
      email: "staff@gtmsw.com.my",
      displayName: "Staff User",
      department: "Finance",
    })).toEqual({ valid: true, accountType: "full_time" });
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const loader = readFileSync(new URL("../components/ui/GTLoader.tsx", import.meta.url), "utf8");
const skeleton = readFileSync(new URL("../components/ui/PageSkeleton.tsx", import.meta.url), "utf8");
const backButton = readFileSync(new URL("../components/ui/BackButton.tsx", import.meta.url), "utf8");
const globalCss = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8"
);

describe("GT route loader", () => {
  it("exposes status semantics and the approved GT path structure", () => {
    expect(loader).toContain('role="status"');
    expect(loader).toContain('aria-live="polite"');
    expect(loader).toContain("aria-label={label}");
    expect(loader).toContain("gt-loader--delayed");
    expect(loader).toContain("gt-loader__track");
    expect(loader).toContain("gt-loader__route");
    expect(loader).toContain("gt-loader__dot");
    expect(loader).toContain('pathLength="100"');
    expect(loader).not.toContain("gt-loader__letters");
  });

  it("uses the approved timing and removes circular and pulse motion", () => {
    expect(globalCss).toContain("--loader-duration: 3s");
    expect(globalCss).toContain(
      "cubic-bezier(0.785, 0.135, 0.15, 0.86)"
    );
    expect(globalCss).toContain("@keyframes gt-loader-path");
    expect(globalCss).toContain("@keyframes gt-loader-dot");
    expect(globalCss).not.toContain("@keyframes gt-loader-orbit");
    expect(globalCss).not.toContain("@keyframes gt-loader-pulse");
  });

  it("provides a static reduced-motion fallback", () => {
    expect(globalCss).toMatch(/\.gt-loader__route,\r?\n\s+\.gt-loader__dot/);
    expect(globalCss).toContain(".gt-loader__track {");
    expect(globalCss).toContain("stroke: var(--brand)");
  });
});

describe("page skeleton variants", () => {
  const variants = [
    "dashboard",
    "table",
    "ticket-detail",
    "profile",
    "notifications",
  ];

  it.each(variants)("renders a stable %s structure", (variant) => {
    expect(skeleton).toContain(`data-skeleton="${variant}"`);
    expect(skeleton).toContain('role="status"');
    expect(skeleton).toContain("skeleton-block");
  });

  it("keeps three compact notification placeholders", () => {
    expect(skeleton).toContain("Array.from({ length: 3 }");
  });

  it("keeps six repeatable table rows", () => {
    expect(skeleton).toContain("Array.from({ length: 6 }");
  });
});

describe("fixed back targets", () => {
  it("renders the explicit href instead of browser history", () => {
    expect(backButton).toContain("href={href}");
    expect(backButton).toContain("arrow-action--back");
    expect(backButton).not.toContain("history.back");
  });

  it("maps authentication and ticket pages to their specified parents", () => {
    const login = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
    const register = readFileSync(new URL("../app/register/page.tsx", import.meta.url), "utf8");
    const forgot = readFileSync(new URL("../app/forgot-password/page.tsx", import.meta.url), "utf8");
    const reset = readFileSync(new URL("../app/reset-password/page.tsx", import.meta.url), "utf8");
    const verify = readFileSync(new URL("../app/verify-email/page.tsx", import.meta.url), "utf8");
    const newTicket = readFileSync(new URL("../app/(workspace)/tickets/new/page.tsx", import.meta.url), "utf8");
    const ticketDetail = readFileSync(new URL("../app/(workspace)/tickets/[id]/page.tsx", import.meta.url), "utf8");

    expect(login).toContain('backHref="/"');
    for (const page of [register, forgot, reset, verify]) expect(page).toContain('backHref="/login"');
    expect(newTicket).toContain('backHref="/tickets"');
    expect(ticketDetail).toContain('<BackButton href="/tickets"');
  });
});

describe("notification state separation", () => {
  const source = readFileSync(new URL("../components/workspace/NotificationsMenu.tsx", import.meta.url), "utf8");

  it("separates loading, error, empty, success, and stale-content error states", () => {
    expect(source).toContain('loading && notifications.length === 0');
    expect(source).toContain('notifications.length === 0 && !error && !loading');
    expect(source).toContain("notifications.map");
    expect(source).toContain("{error && (");
    expect(source).not.toContain("setNotifications([])");
    expect(source).toContain("Retry");
  });
});

describe("route loading boundaries", () => {
  it("keeps public and workspace fallbacks scoped independently", () => {
    const rootLoading = readFileSync(new URL("../app/loading.tsx", import.meta.url), "utf8");
    const workspaceLoading = readFileSync(new URL("../app/(workspace)/loading.tsx", import.meta.url), "utf8");
    expect(rootLoading).toContain("fullCanvas");
    expect(workspaceLoading).not.toContain("fullCanvas");
    expect(workspaceLoading).toContain('className="min-h-[50vh]"');
  });
});

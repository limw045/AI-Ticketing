import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const detailPage = readFileSync(
  new URL("../app/(workspace)/tickets/[id]/page.tsx", import.meta.url),
  "utf8"
);
const attachmentView = readFileSync(
  new URL("../components/tickets/TicketAttachments.tsx", import.meta.url),
  "utf8"
);
const proxyRoute = readFileSync(
  new URL("../app/api/attachments/[...path]/route.ts", import.meta.url),
  "utf8"
);

describe("ticket attachment display", () => {
  it("separates safe description text from recognized attachment references", () => {
    expect(detailPage).toContain("parseTicketDescription(ticket.description)");
    expect(detailPage).toContain("<TicketAttachments");
    expect(detailPage).not.toContain("{ticket.description}");
  });

  it("renders private images and TXT log actions without arbitrary HTML", () => {
    expect(attachmentView).toContain("Attached screenshots");
    expect(attachmentView).toContain("TXT logs");
    expect(attachmentView).toContain("View log");
    expect(attachmentView).toContain("Download");
    expect(attachmentView).not.toContain("dangerouslySetInnerHTML");
  });

  it("supports authenticated download responses", () => {
    expect(proxyRoute).toContain('searchParams.get("download")');
    expect(proxyRoute).toContain("downloadName");
  });
});

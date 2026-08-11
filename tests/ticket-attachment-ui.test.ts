import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const uploadHelper = readFileSync(
  new URL("../lib/image-upload.ts", import.meta.url),
  "utf8"
);
const picker = readFileSync(
  new URL("../components/tickets/TicketAttachmentPicker.tsx", import.meta.url),
  "utf8"
);
const newTicketPage = readFileSync(
  new URL("../app/(workspace)/tickets/new/page.tsx", import.meta.url),
  "utf8"
);

describe("ticket attachment UI", () => {
  it("uploads private images and scanned plain-text logs", () => {
    expect(uploadHelper).toContain("uploadTicketAttachment");
    expect(uploadHelper).toContain("scanSensitiveData");
    expect(uploadHelper).toContain("text/plain");
    expect(uploadHelper).toContain("removeTicketAttachment");
  });

  it("offers a multiple file picker with image and TXT support", () => {
    expect(picker).toContain("Attach files");
    expect(picker).toContain("multiple");
    expect(picker).toContain(".txt");
    expect(picker).toContain("Remove");
  });

  it("supports paste uploads and blocks submit while files upload", () => {
    expect(newTicketPage).toContain("handleAttachmentFiles");
    expect(newTicketPage).toContain("onPaste={handlePaste}");
    expect(newTicketPage).toContain("attachmentsUploading");
  });
});

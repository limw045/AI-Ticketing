import { describe, expect, it } from "vitest";
import {
  MAX_TEXT_LOG_BYTES,
  parseTicketDescription,
  serializeAttachmentReference,
  validateAttachmentFile,
  type TicketAttachment,
} from "../lib/ticket-attachments";
import { scanSensitiveData } from "../lib/security-scanner";

const file = (name: string, type: string, size: number) => ({ name, type, size });

describe("ticket attachment contracts", () => {
  it("accepts supported images and text logs", () => {
    expect(validateAttachmentFile(file("screen.png", "image/png", 1024))).toBeNull();
    expect(validateAttachmentFile(file("run.txt", "text/plain", 1024))).toBeNull();
  });

  it("rejects unsupported files and oversized text logs", () => {
    expect(validateAttachmentFile(file("report.pdf", "application/pdf", 1024)))
      .toMatch(/JPEG, PNG, WebP, or TXT/);
    expect(validateAttachmentFile(file("run.txt", "text/plain", MAX_TEXT_LOG_BYTES + 1)))
      .toMatch(/2 MB/);
  });

  it("round-trips application-generated image and log references", () => {
    const attachments: TicketAttachment[] = [
      {
        kind: "image",
        name: "Screenshot",
        url: "/api/attachments/user/image.jpg",
        storagePath: "user/image.jpg",
      },
      {
        kind: "log",
        name: "automation-run.txt",
        url: "/api/attachments/user/automation-run.txt",
        storagePath: "user/automation-run.txt",
      },
    ];
    const description = [
      "The automation stopped during reconciliation.",
      ...attachments.map(serializeAttachmentReference),
    ].join("\n\n");

    expect(parseTicketDescription(description)).toEqual({
      text: "The automation stopped during reconciliation.",
      attachments,
    });
  });

  it("does not interpret arbitrary Markdown or external URLs", () => {
    const unsafe = "<script>alert(1)</script>\n\n![Screenshot](https://example.com/a.png)";
    expect(parseTicketDescription(unsafe)).toEqual({ text: unsafe, attachments: [] });
  });

  it("parses legacy private screenshot references", () => {
    expect(
      parseTicketDescription("Details\n\n![Screenshot](/api/attachments/user/old.jpg)")
    ).toEqual({
      text: "Details",
      attachments: [
        {
          kind: "image",
          name: "Screenshot",
          url: "/api/attachments/user/old.jpg",
          storagePath: "user/old.jpg",
        },
      ],
    });
  });

  it("detects credentials commonly found in plain-text logs", () => {
    expect(scanSensitiveData("password=hunter2").hasSensitive).toBe(true);
    expect(scanSensitiveData("Authorization: Bearer abc.def.ghi").hasSensitive).toBe(true);
  });
});

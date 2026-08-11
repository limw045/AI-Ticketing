export const MAX_TEXT_LOG_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ATTACHMENT_PATTERN =
  /!\[Screenshot\]\((\/api\/attachments\/[^)\s]+)\)|\[Log: ([^\]\r\n]+)\]\((\/api\/attachments\/[^)\s]+)\)/g;

export type TicketAttachmentKind = "image" | "log";

export interface TicketAttachment {
  kind: TicketAttachmentKind;
  name: string;
  url: string;
  storagePath: string;
}

export interface AttachmentFileMetadata {
  name: string;
  type: string;
  size: number;
}

export function isTextLog(file: AttachmentFileMetadata): boolean {
  return file.name.toLowerCase().endsWith(".txt") &&
    (file.type === "text/plain" || file.type === "");
}

export function validateAttachmentFile(file: AttachmentFileMetadata): string | null {
  if (IMAGE_MIME_TYPES.has(file.type)) {
    return file.size > MAX_IMAGE_BYTES
      ? "Images must be 10 MB or smaller before compression."
      : null;
  }
  if (isTextLog(file)) {
    return file.size > MAX_TEXT_LOG_BYTES
      ? "TXT logs must be 2 MB or smaller."
      : null;
  }
  return "Attachments must be JPEG, PNG, WebP, or TXT files.";
}

export function sanitizeAttachmentName(name: string): string {
  const cleaned = name
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._ -]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 100);
  return cleaned || "attachment";
}

export function attachmentStoragePathFromUrl(url: string): string | null {
  const prefix = "/api/attachments/";
  if (!url.startsWith(prefix)) return null;
  try {
    const path = url
      .slice(prefix.length)
      .split("/")
      .map(decodeURIComponent)
      .join("/");
    if (!path || path.split("/").some((segment) => !segment || segment === "..")) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

export function serializeAttachmentReference(attachment: TicketAttachment): string {
  if (attachment.kind === "image") {
    return `![Screenshot](${attachment.url})`;
  }
  return `[Log: ${sanitizeAttachmentName(attachment.name)}](${attachment.url})`;
}

export function parseTicketDescription(description: string): {
  text: string;
  attachments: TicketAttachment[];
} {
  const attachments: TicketAttachment[] = [];
  const text = description
    .replace(ATTACHMENT_PATTERN, (reference, imageUrl, logName, logUrl) => {
      const url = imageUrl || logUrl;
      const storagePath = attachmentStoragePathFromUrl(url);
      if (!storagePath) return reference;
      attachments.push({
        kind: imageUrl ? "image" : "log",
        name: imageUrl ? "Screenshot" : sanitizeAttachmentName(logName),
        url,
        storagePath,
      });
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, attachments };
}

export function appendAttachmentReference(
  description: string,
  attachment: TicketAttachment
): string {
  return [description.trimEnd(), serializeAttachmentReference(attachment)]
    .filter(Boolean)
    .join("\n\n");
}

export function removeAttachmentReference(
  description: string,
  attachment: TicketAttachment
): string {
  const reference = serializeAttachmentReference(attachment);
  return description
    .replace(reference, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

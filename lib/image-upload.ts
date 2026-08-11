import { createClient } from "@/lib/supabase/client";
import { scanSensitiveData } from "@/lib/security-scanner";
import {
  isTextLog,
  sanitizeAttachmentName,
  validateAttachmentFile,
  type TicketAttachment,
} from "@/lib/ticket-attachments";

function attachmentUrl(storagePath: string): string {
  return `/api/attachments/${storagePath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Image could not be read."));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image format could not be decoded."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Image compression is unavailable in this browser."));
          return;
        }
        context.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => blob
            ? resolve(blob)
            : reject(new Error("Image compression failed.")),
          "image/jpeg",
          0.85
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadTicketAttachment(
  file: File,
  onProgress?: (pct: number) => void
): Promise<TicketAttachment> {
  const validationError = validateAttachmentFile(file);
  if (validationError) throw new Error(validationError);
  onProgress?.(10);

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Please sign in before uploading an attachment.");
  }

  const textLog = isTextLog(file);
  let uploadBody: Blob | File;
  let contentType: string;
  let displayName: string;
  let objectName: string;

  if (textLog) {
    const content = await file.text();
    if (content.includes("\0")) {
      throw new Error("TXT logs must contain plain text and cannot include binary data.");
    }
    const scan = scanSensitiveData(content);
    if (scan.hasSensitive) {
      throw new Error(
        `Data Guard detected ${scan.matchType ?? "sensitive data"} in this TXT log. Redact it before uploading.`
      );
    }
    displayName = sanitizeAttachmentName(file.name);
    objectName = `${crypto.randomUUID()}-${displayName.replace(/\s+/g, "-")}`;
    uploadBody = file;
    contentType = "text/plain";
  } else {
    uploadBody = await compressImage(file);
    displayName = "Screenshot";
    objectName = `${crypto.randomUUID()}.jpg`;
    contentType = "image/jpeg";
  }
  onProgress?.(40);

  const storagePath = `${user.id}/${objectName}`;
  const { error } = await supabase.storage
    .from("ticket-attachments")
    .upload(storagePath, uploadBody, { contentType, upsert: false });
  if (error) throw new Error(`Attachment upload failed: ${error.message}`);
  onProgress?.(100);

  return {
    kind: textLog ? "log" : "image",
    name: displayName,
    url: attachmentUrl(storagePath),
    storagePath,
  };
}

export async function removeTicketAttachment(storagePath: string): Promise<void> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Please sign in to remove attachments.");
  if (storagePath.split("/")[0] !== user.id) {
    throw new Error("You can only remove attachments from your own draft.");
  }
  const { error } = await supabase.storage
    .from("ticket-attachments")
    .remove([storagePath]);
  if (error) throw new Error(`Attachment removal failed: ${error.message}`);
}

export async function compressAndUploadImage(
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const attachment = await uploadTicketAttachment(file, onProgress);
  if (attachment.kind !== "image") throw new Error("Expected an image attachment.");
  return attachment.url;
}

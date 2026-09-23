"use client";

import Image from "next/image";
import { FileText, ImagePlus, LoaderCircle, Paperclip, X } from "lucide-react";
import type { TicketAttachment } from "@/lib/ticket-attachments";

interface TicketAttachmentPickerProps {
  attachments: TicketAttachment[];
  uploading: boolean;
  progress: number;
  uploadLabel: string;
  onFilesSelected: (files: File[]) => void;
  onRemove: (attachment: TicketAttachment) => void;
}

export function TicketAttachmentPicker({
  attachments,
  uploading,
  progress,
  uploadLabel,
  onFilesSelected,
  onRemove,
}: TicketAttachmentPickerProps) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink)]">Attachments</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Add screenshots or sanitized TXT logs. Images are compressed automatically.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-bold text-[var(--brand-on)] transition hover:bg-[var(--brand-hover)]">
          <Paperclip className="h-4 w-4" /> Attach files
          <input
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp,text/plain,.txt"
            multiple
            disabled={uploading}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length) onFilesSelected(files);
            }}
          />
        </label>
      </div>

      {uploading && (
        <div className="mt-4 rounded-xl bg-[var(--brand-soft)] px-4 py-3 text-xs font-semibold text-[var(--brand-ink)]">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" /> {uploadLabel}
            </span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {attachments.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.storagePath}
              className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]"
            >
              {attachment.kind === "image" ? (
                <div className="flex items-center gap-3 p-3">
                  <Image
                    src={attachment.url}
                    alt="Attached screenshot"
                    width={72}
                    height={54}
                    unoptimized
                    className="h-[54px] w-[72px] rounded-lg object-cover"
                  />
                  <span className="flex min-w-0 items-center gap-2 text-xs font-semibold">
                    <ImagePlus className="h-4 w-4 shrink-0 text-[var(--brand-ink)]" />
                    Screenshot
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 pr-10">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-ink)]">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 truncate text-xs font-semibold">
                    {attachment.name}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemove(attachment)}
                disabled={uploading}
                aria-label={`Remove ${attachment.name}`}
                title="Remove"
                className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-xs text-[var(--faint)]">
          <ImagePlus className="h-3.5 w-3.5" /> You can also paste a screenshot with Ctrl + V.
        </p>
      )}
    </div>
  );
}

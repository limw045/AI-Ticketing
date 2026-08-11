import Image from "next/image";
import { Download, ExternalLink, FileText } from "lucide-react";
import type { TicketAttachment } from "@/lib/ticket-attachments";

export function TicketAttachments({
  attachments,
}: {
  attachments: TicketAttachment[];
}) {
  const images = attachments.filter((attachment) => attachment.kind === "image");
  const logs = attachments.filter((attachment) => attachment.kind === "log");
  if (!attachments.length) return null;

  return (
    <div className="mt-5 space-y-5 border-t border-[var(--line)] pt-5">
      {images.length > 0 && (
        <div>
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            Attached screenshots
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {images.map((attachment, index) => (
              <a
                key={attachment.storagePath}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="group relative overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-2)] transition hover:border-[var(--brand)]"
              >
                <Image
                  src={attachment.url}
                  alt={`Attached screenshot ${index + 1}`}
                  width={640}
                  height={360}
                  unoptimized
                  className="aspect-video h-auto w-full object-cover"
                />
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2.5 py-1 text-[10px] font-bold text-[var(--ink)] shadow-[var(--shadow-sm)]">
                  <ExternalLink className="h-3 w-3" /> Open full size
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div>
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            TXT logs
          </h3>
          <div className="mt-3 space-y-2">
            {logs.map((attachment) => {
              const downloadUrl = `${attachment.url}?download=1&name=${encodeURIComponent(attachment.name)}`;
              return (
                <div
                  key={attachment.storagePath}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-ink)]">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="truncate text-xs font-semibold text-[var(--ink)]">
                      {attachment.name}
                    </span>
                  </span>
                  <span className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-bold text-[var(--ink)] hover:border-[var(--brand)]"
                    >
                      View log
                    </a>
                    <a
                      href={downloadUrl}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[var(--brand)] px-3 py-1.5 text-[11px] font-bold text-[var(--brand-on)] hover:bg-[var(--brand-hover)]"
                    >
                      <Download className="h-3 w-3" /> Download
                    </a>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

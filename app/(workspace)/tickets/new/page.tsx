"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TicketAttachmentPicker } from "@/components/tickets/TicketAttachmentPicker";
import { scanSensitiveData } from "@/lib/security-scanner";
import {
  removeTicketAttachment,
  uploadTicketAttachment,
} from "@/lib/image-upload";
import {
  appendAttachmentReference,
  parseTicketDescription,
  removeAttachmentReference,
  type TicketAttachment,
} from "@/lib/ticket-attachments";
import {
  resolveDefaultCategory,
  sortCategoryRules,
  type CategoryRule,
} from "@/lib/ticket-categories";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button, FieldLabel, Input, Select, Textarea } from "@/components/ui/FormField";
import {
  ShieldCheck,
  Layers,
  Trash2,
  ArrowRight,
  Monitor,
  Flame,
  Check,
} from "lucide-react";

export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedDraftAlert, setSavedDraftAlert] = useState(false);
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");
  const [formError, setFormError] = useState("");
  const [initialized, setInitialized] = useState(false);
  const parsedDescription = parseTicketDescription(description);
  const attachments = parsedDescription.attachments;

  useEffect(() => {
    let cancelled = false;
    const initializeForm = async () => {
      let draft: Record<string, string> = {};
      const saved = localStorage.getItem("ticketing_draft");
      try {
        draft = saved ? JSON.parse(saved) : {};
      } catch (e) {
        console.error("Draft restore error:", e);
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("category_rules")
        .select("id, category_name, template_markdown, default_assignee_id")
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (cancelled) return;

      if (error || !data?.length) {
        setFormError(
          error
            ? `Could not load ticket categories: ${error.message}`
            : "No active ticket categories are available. Please contact an administrator."
        );
        setCategoriesLoading(false);
        setInitialized(true);
        return;
      }

      const rules = sortCategoryRules(data as CategoryRule[]);
      const draftCategory = typeof draft.category === "string" ? draft.category : "";
      const selectedCategory = rules.some((rule) => rule.category_name === draftCategory)
        ? draftCategory
        : resolveDefaultCategory(rules) ?? "";
      const selectedRule = rules.find((rule) => rule.category_name === selectedCategory);

      setCategoryRules(rules);
      setTitle(typeof draft.title === "string" ? draft.title : "");
      setCategory(selectedCategory);
      setPriority(typeof draft.priority === "string" ? draft.priority : "medium");
      setDescription(
        typeof draft.description === "string" && draft.description.trim()
          ? draft.description
          : selectedRule?.template_markdown ?? ""
      );
      if (saved) {
        setSavedDraftAlert(true);
        setTimeout(() => setSavedDraftAlert(false), 3000);
      }
      setCategoriesLoading(false);
      setInitialized(true);
    };

    initializeForm();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initialized && (title || description)) {
      localStorage.setItem(
        "ticketing_draft",
        JSON.stringify({ title, description, category, priority })
      );
    }
  }, [title, description, category, priority, initialized]);

  const handleCategoryChange = (cat: string) => {
    const currentTemplate = categoryRules.find(
      (rule) => rule.category_name === category
    )?.template_markdown;
    const nextTemplate = categoryRules.find(
      (rule) => rule.category_name === cat
    )?.template_markdown;
    setCategory(cat);
    if (!description.trim() || description === currentTemplate) {
      setDescription(nextTemplate ?? "");
    }
  };

  const handleAttachmentFiles = async (files: File[]) => {
    if (!files.length || attachmentsUploading) return;
    setAttachmentsUploading(true);
    setFormError("");
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setUploadProgress(0);
      setUploadLabel(`Uploading ${index + 1}/${files.length}: ${file.name}`);
      try {
        const attachment = await uploadTicketAttachment(file, setUploadProgress);
        setDescription((current) => appendAttachmentReference(current, attachment));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Attachment upload failed.";
        setFormError(`${file.name}: ${message}`);
      }
    }
    setAttachmentsUploading(false);
    setUploadProgress(0);
    setUploadLabel("");
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const images = Array.from(event.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (images.length) {
      event.preventDefault();
      void handleAttachmentFiles(images);
    }
  };

  const handleRemoveAttachment = async (attachment: TicketAttachment) => {
    if (attachmentsUploading) return;
    setFormError("");
    try {
      await removeTicketAttachment(attachment.storagePath);
      setDescription((current) => removeAttachmentReference(current, attachment));
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Attachment could not be removed."
      );
    }
  };

  const handleClearDraft = async () => {
    setFormError("");
    const cleanupResults = await Promise.allSettled(
      attachments.map((attachment) => removeTicketAttachment(attachment.storagePath))
    );
    const removedAttachments = attachments.filter(
      (_attachment, index) => cleanupResults[index].status === "fulfilled"
    );
    const failedCleanup = cleanupResults.find(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );
    if (failedCleanup) {
      setDescription((current) =>
        removedAttachments.reduce(
          (next, attachment) => removeAttachmentReference(next, attachment),
          current
        )
      );
      setFormError(
        failedCleanup.reason instanceof Error
          ? failedCleanup.reason.message
          : "Draft attachments could not be removed. The draft was not cleared."
      );
      return;
    }
    setTitle("");
    setDescription(
      categoryRules.find((rule) => rule.category_name === category)
        ?.template_markdown ?? ""
    );
    localStorage.removeItem("ticketing_draft");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityWarning(null);
    setFormError("");

    const scan = scanSensitiveData(title + " " + description);
    if (scan.hasSensitive) {
      setSecurityWarning(
        `Security Guard Alert: Detected possible sensitive data (${scan.matchType}) in your ticket text (${scan.matchedText}). Please redact passwords or API keys before submitting.`
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setFormError("Please sign in first.");
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", user.id)
      .single();
    if (profileError || !profile || profile.account_status !== "active") {
      setFormError(
        profileError?.message ||
          "Your staff profile is unavailable or inactive."
      );
      setLoading(false);
      return;
    }

    const deviceContext = {
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      pageUrl: window.location.href,
      submittedAt: new Date().toISOString(),
    };

    const { data: createdTicket, error: insertError } = await supabase
      .from("tickets")
      .insert({
        title: title.trim(),
        category,
        priority,
        description,
        author_id: user.id,
        device_context: deviceContext,
        source: "portal",
      })
      .select("id")
      .single();

    if (insertError || !createdTicket) {
      setFormError(
        `Failed to submit ticket: ${
          insertError?.message || "Database did not return the new ticket."
        }`
      );
      setLoading(false);
    } else {
      if (attachments.length > 0) {
        const { error: attachmentBindError } = await supabase
          .from("ticket_attachments")
          .update({ ticket_id: createdTicket.id })
          .eq("uploader_id", user.id)
          .is("ticket_id", null)
          .in("storage_path", attachments.map((attachment) => attachment.storagePath));
        if (attachmentBindError) {
          setFormError(`Ticket was created, but its attachments could not be linked: ${attachmentBindError.message}`);
          setLoading(false);
          return;
        }
      }
      localStorage.removeItem("ticketing_draft");
      router.replace("/tickets");
      router.refresh();
    }
  };

  return (
    <div className="space-y-10">
      {formError && (
        <Alert tone="error" role="alert">
          {formError}
        </Alert>
      )}

      {savedDraftAlert && (
        <Alert tone="info">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Restored auto-saved draft from your previous session.
          </span>
          <button
            onClick={handleClearDraft}
            className="mt-2 text-xs font-semibold underline hover:text-[var(--danger)]"
          >
            Clear draft
          </button>
        </Alert>
      )}

      {securityWarning && (
        <Alert tone="error" role="alert">
          <strong className="block">Sensitive data detected</strong>
          <span className="mt-1 block opacity-90">{securityWarning}</span>
        </Alert>
      )}

      <PageHeader
        backHref="/tickets"
        eyebrow="Create request"
        title="Describe what is blocked."
        description="Pick a category for guided details, then attach screenshots or sanitized TXT logs when useful."
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="surface p-4 sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-soft)] font-mono text-[11px] font-bold text-[var(--brand-ink)]">
              1
            </span>
            <div>
              <h2 className="font-display text-base font-bold">Details</h2>
              <p className="text-xs text-[var(--muted)]">
                The subject and routing information.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <label className="block">
              <FieldLabel>Title</FieldLabel>
              <Input
                type="text"
                placeholder="Title of AI request or bug..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel>Category</FieldLabel>
                <span className="relative block">
                  <Layers className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[var(--muted)]" />
                  <Select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="pl-10"
                  >
                    {categoryRules.map((rule) => (
                      <option key={rule.id} value={rule.category_name}>
                        {rule.category_name}
                      </option>
                    ))}
                  </Select>
                </span>
              </label>

              <label className="block">
                <FieldLabel>Priority</FieldLabel>
                <span className="relative block">
                  <Flame className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[var(--muted)]" />
                  <Select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="pl-10"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">P0 Urgent</option>
                  </Select>
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 font-mono text-[10px] font-semibold text-[var(--muted)]">
                <Monitor className="h-3.5 w-3.5" /> Auto-context attached
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-[var(--success-soft)] px-3 py-1.5 font-mono text-[10px] font-bold text-[var(--success)]">
                <ShieldCheck className="h-3.5 w-3.5" /> Data guard active
              </span>
            </div>
          </div>
        </section>

        <section className="surface overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[var(--line)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-soft)] font-mono text-[11px] font-bold text-[var(--brand-ink)]">
                2
              </span>
              <div>
                <h2 className="font-display text-base font-bold">Description</h2>
                <p className="text-xs text-[var(--muted)]">
                  Follow the guidance and avoid credentials or sensitive data.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-2)] p-1 text-xs font-semibold sm:flex">
              <button
                type="button"
                onClick={() => setPreviewTab("edit")}
                className={`rounded-full px-3 py-1 transition ${
                  previewTab === "edit"
                    ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--muted)]"
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("preview")}
                className={`rounded-full px-3 py-1 transition ${
                  previewTab === "preview"
                    ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--muted)]"
                }`}
              >
                Preview
              </button>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-6">
            {previewTab === "edit" ? (
              <Textarea
                rows={14}
                value={description}
                onPaste={handlePaste}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Describe the request using the guidance for this category..."
                className="min-h-[240px] font-mono sm:min-h-[320px]"
              />
            ) : (
              <div className="min-h-[240px] whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 font-mono text-sm leading-relaxed text-[var(--ink-2)] sm:min-h-[320px] sm:p-5">
                {parsedDescription.text}
              </div>
            )}

            <TicketAttachmentPicker
              attachments={attachments}
              uploading={attachmentsUploading}
              progress={uploadProgress}
              uploadLabel={uploadLabel}
              onFilesSelected={(files) => void handleAttachmentFiles(files)}
              onRemove={(attachment) => void handleRemoveAttachment(attachment)}
            />
          </div>
        </section>

        <div className="safe-area-bottom sticky bottom-0 z-20 -mx-4 flex w-[calc(100%+2rem)] items-center justify-between gap-3 border border-[var(--line)] bg-[var(--surface)] px-4 pt-3 shadow-[var(--shadow-lg)] sm:bottom-5 sm:mx-auto sm:w-full sm:max-w-md sm:rounded-full sm:px-5 sm:py-3">
          <button
            type="button"
            onClick={() => void handleClearDraft()}
            disabled={attachmentsUploading}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 px-2 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--danger)]"
            title="Discard draft"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>

          <Button
            type="submit"
            disabled={loading || attachmentsUploading || categoriesLoading || !category}
            className="min-w-0 flex-1 sm:min-w-[150px] sm:flex-none"
          >
            {loading ? "Submitting…" : "Submit to AI team"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

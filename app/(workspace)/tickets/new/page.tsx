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
  sortCategoryRules,
  type CategoryRule,
} from "@/lib/ticket-categories";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button, FieldLabel, Input, Select, Textarea } from "@/components/ui/FormField";
import { firstTicketSubmissionError, validateTicketSubmission, type TicketSubmissionErrors } from "@/lib/ticket-submission";
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
  const [impact, setImpact] = useState("");
  const [p0Confirmed, setP0Confirmed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<TicketSubmissionErrors>({});
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
      const selectedCategory = rules.some((rule) => rule.category_name === draftCategory) ? draftCategory : "";

      setCategoryRules(rules);
      setTitle(typeof draft.title === "string" ? draft.title : "");
      setCategory(selectedCategory);
      setPriority(typeof draft.priority === "string" ? draft.priority : "medium");
      setImpact(typeof draft.impact === "string" ? draft.impact : "");
      setP0Confirmed(draft.p0Confirmed === "true");
      setDescription(
        typeof draft.description === "string" && draft.description.trim()
          ? draft.description
          : ""
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
        JSON.stringify({ title, description, category, priority, impact, p0Confirmed: String(p0Confirmed) })
      );
    }
  }, [title, description, category, priority, impact, p0Confirmed, initialized]);

  const handleCategoryChange = (cat: string) => {
    const currentTemplate = categoryRules.find(
      (rule) => rule.category_name === category
    )?.template_markdown;
    const nextTemplate = categoryRules.find(
      (rule) => rule.category_name === cat
    )?.template_markdown;
    setCategory(cat);
    setFieldErrors((current) => ({ ...current, category: undefined }));
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
    if (!window.confirm("Clear this draft and remove its uploaded attachments?")) return;
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
    setCategory("");
    setPriority("medium");
    setDescription("");
    setImpact("");
    setP0Confirmed(false);
    setFieldErrors({});
    localStorage.removeItem("ticketing_draft");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityWarning(null);
    setFormError("");

    const template = categoryRules.find((rule) => rule.category_name === category)?.template_markdown ?? "";
    const validationErrors = validateTicketSubmission({ title, category, priority, description: parsedDescription.text, template, impact, p0Confirmed });
    setFieldErrors(validationErrors);
    const firstError = firstTicketSubmissionError(validationErrors);
    if (firstError) {
      document.getElementById(`ticket-${firstError}`)?.focus();
      return;
    }

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

    const { data: createdTicketId, error: insertError } = await supabase.rpc("submit_portal_ticket", {
      p_title: title.trim(),
      p_category: category,
      p_priority: priority,
      p_description: description,
      p_device_context: deviceContext,
      p_attachment_paths: attachments.map((attachment) => attachment.storagePath),
      p_impact: priority === "urgent" ? impact.trim() : null,
    });

    if (insertError || !createdTicketId) {
      setFormError(
        `Failed to submit ticket: ${
          insertError?.message || "Database did not return the new ticket."
        }`
      );
      setLoading(false);
    } else {
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
        title="Create a request"
        description="Pick a category for guided details, then attach screenshots or sanitized TXT logs when useful."
      />

      <form onSubmit={handleSubmit} className="request-form space-y-8">
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
                id="ticket-title"
                type="text"
                placeholder="Title of AI request or bug..."
                value={title}
                onChange={(e) => { setTitle(e.target.value); setFieldErrors((current) => ({ ...current, title: undefined })); }}
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? "title-error" : undefined}
              />
              {fieldErrors.title && <span id="title-error" className="mt-2 block text-xs text-[var(--danger)]">{fieldErrors.title}</span>}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel>Category</FieldLabel>
                <span className="relative block">
                  <Layers className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[var(--muted)]" />
                  <Select
                    id="ticket-category"
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="pl-10"
                    aria-invalid={Boolean(fieldErrors.category)}
                  >
                    <option value="">Select a category…</option>
                    {categoryRules.map((rule) => (
                      <option key={rule.id} value={rule.category_name}>
                        {rule.category_name}
                      </option>
                    ))}
                  </Select>
                </span>
                {fieldErrors.category && <span className="mt-2 block text-xs text-[var(--danger)]">{fieldErrors.category}</span>}
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

            {priority === "urgent" && <div className="space-y-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-4">
              <label className="block"><FieldLabel className="text-[var(--danger)]">Business impact</FieldLabel><Textarea id="ticket-impact" rows={3} value={impact} onChange={(event) => { setImpact(event.target.value); setFieldErrors((current) => ({ ...current, impact: undefined })); }} placeholder="Who is affected, what is blocked, and why can this not wait?" aria-invalid={Boolean(fieldErrors.impact)} />{fieldErrors.impact && <span className="mt-2 block text-xs text-[var(--danger)]">{fieldErrors.impact}</span>}</label>
              <label className="flex items-start gap-3 text-sm"><input id="ticket-p0Confirmed" type="checkbox" checked={p0Confirmed} onChange={(event) => { setP0Confirmed(event.target.checked); setFieldErrors((current) => ({ ...current, p0Confirmed: undefined })); }} className="mt-0.5 h-5 w-5" /><span>I confirm this is business-critical and requires immediate response.</span></label>
              {fieldErrors.p0Confirmed && <span className="block text-xs text-[var(--danger)]">{fieldErrors.p0Confirmed}</span>}
            </div>}

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
                id="ticket-description"
                rows={14}
                value={description}
                onPaste={handlePaste}
                onChange={(e) => { setDescription(e.target.value); setFieldErrors((current) => ({ ...current, description: undefined })); }}
                aria-invalid={Boolean(fieldErrors.description)}
                placeholder="Describe the request using the guidance for this category..."
                className="min-h-[240px] font-mono sm:min-h-[320px]"
              />
            ) : (
              <div className="ticket-text min-h-[240px] rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4 font-mono text-sm leading-relaxed text-[var(--ink-2)] sm:min-h-[320px] sm:p-5">
                {parsedDescription.text}
              </div>
            )}
            {fieldErrors.description && <span className="mt-2 block text-xs text-[var(--danger)]">{fieldErrors.description}</span>}

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

        <div className="request-actions safe-area-bottom sticky bottom-0 z-20 -mx-4 flex w-[calc(100%+2rem)] items-center justify-between gap-3 border border-[var(--line)] bg-[var(--surface)] px-4 pt-3 shadow-[var(--shadow-lg)] sm:bottom-5 sm:mx-auto sm:w-full sm:max-w-md sm:rounded-full sm:px-5 sm:py-3">
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

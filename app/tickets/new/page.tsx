"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IncidentBanner } from "@/components/IncidentBanner";
import { scanSensitiveData } from "@/lib/security-scanner";
import { compressAndUploadImage } from "@/lib/image-upload";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button, FieldLabel, Input, Select, Textarea } from "@/components/ui/FormField";
import {
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
  Layers,
  Trash2,
  ArrowRight,
  Monitor,
  Flame,
  Check,
} from "lucide-react";

const CATEGORY_TEMPLATES: Record<string, string> = {
  "System Bug": `## Bug Overview
- **App / Page URL**: https://
- **Expected Result**: 
- **Actual Behavior**: 

### Steps to Reproduce
1. Go to page...
2. Click on...
3. See error...
`,
  Hardware: `## Hardware & GPU Access Request
- **Device / GPU Type**: RTX 4090 / A100 / Display / Mac
- **Asset S/N**: 
- **Location / Desk**: 

### Request Details
`,
  "VPN & Network": `## AI Pipeline & Network Issue
- **Environment**: Office Wi-Fi / Remote VPN / Server Cluster
- **Error Code / Log**: 
- **Connection Type**: GlobalProtect / SSH / HTTPS
`,
  Permissions: `## Model & Dataset Access Request
- **Target AI Model / Dataset**: 
- **Permission Level**: Read / Fine-Tune / Admin
- **Supervisor Approval**: Approved
`,
};

export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("System Bug");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState(
    CATEGORY_TEMPLATES["System Bug"]
  );
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savedDraftAlert, setSavedDraftAlert] = useState(false);
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("ticketing_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.priority) setPriority(parsed.priority);
        setSavedDraftAlert(true);
        setTimeout(() => setSavedDraftAlert(false), 3000);
      } catch (e) {
        console.error("Draft restore error:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (title || description) {
      localStorage.setItem(
        "ticketing_draft",
        JSON.stringify({ title, description, category, priority })
      );
    }
  }, [title, description, category, priority]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    if (CATEGORY_TEMPLATES[cat] && !description.trim()) {
      setDescription(CATEGORY_TEMPLATES[cat]);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setUploadingImage(true);
          setUploadProgress(10);
          try {
            setFormError("");
            const url = await compressAndUploadImage(file, (pct) =>
              setUploadProgress(pct)
            );
            setDescription((prev) => prev + `\n\n![Screenshot](${url})\n`);
          } catch (err) {
            setFormError(
              err instanceof Error ? err.message : "Attachment upload failed."
            );
          } finally {
            setUploadingImage(false);
          }
        }
      }
    }
  };

  const handleClearDraft = () => {
    setTitle("");
    setDescription(CATEGORY_TEMPLATES[category]);
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
      localStorage.removeItem("ticketing_draft");
      router.replace("/tickets");
      router.refresh();
    }
  };

  return (
    <div className="space-y-10">
      <IncidentBanner />
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
        eyebrow="Create request"
        title="Describe what is blocked."
        description="Pick a category to load a structured template. Screenshots can be pasted directly into the description."
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="surface p-6">
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
                    <option value="System Bug">System Bug</option>
                    <option value="Hardware">Hardware & GPU</option>
                    <option value="VPN & Network">Network & Pipeline</option>
                    <option value="Permissions">Model & Access</option>
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
          <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-soft)] font-mono text-[11px] font-bold text-[var(--brand-ink)]">
                2
              </span>
              <div>
                <h2 className="font-display text-base font-bold">Description</h2>
                <p className="text-xs text-[var(--muted)]">
                  Markdown supported; paste a screenshot to attach it.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-2)] p-1 text-xs font-semibold">
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

          <div className="px-6 py-5">
            {previewTab === "edit" ? (
              <Textarea
                rows={14}
                value={description}
                onPaste={handlePaste}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Describe your issue or request in Markdown format..."
                className="min-h-[320px] font-mono text-sm"
              />
            ) : (
              <div className="min-h-[320px] whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-5 font-mono text-sm leading-relaxed text-[var(--ink-2)]">
                {description}
              </div>
            )}

            {uploadingImage && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--brand-soft)] px-4 py-3 text-xs font-semibold text-[var(--brand-ink)]">
                <Sparkles className="h-4 w-4 animate-spin" />
                <span>
                  Compressing & uploading screenshot… {uploadProgress}%
                </span>
              </div>
            )}

            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--faint)]">
              <ImageIcon className="h-3.5 w-3.5" />
              Press Ctrl + V anywhere in the editor to paste a screenshot.
            </p>
          </div>
        </section>

        <div className="sticky bottom-5 z-20 mx-auto flex w-full max-w-md items-center justify-between gap-4 rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-3 shadow-[var(--shadow-lg)]">
          <button
            type="button"
            onClick={handleClearDraft}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--danger)]"
            title="Discard draft"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>

          <Button
            type="submit"
            disabled={loading || uploadingImage}
            className="min-w-[150px]"
          >
            {loading ? "Submitting…" : "Submit to AI team"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}

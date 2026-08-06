"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { IncidentBanner } from "@/components/IncidentBanner";
import { scanSensitiveData } from "@/lib/security-scanner";
import { compressAndUploadImage } from "@/lib/image-upload";
import { EditorialGrid } from "@/components/EditorialGrid";
import {
  AlertOctagon, Image as ImageIcon, Send, Sparkles, Monitor, ShieldCheck, Check,
  Flame, Layers, Trash2, ArrowRight
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
  "Hardware": `## Hardware & GPU Access Request
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
  "Permissions": `## Model & Dataset Access Request
- **Target AI Model / Dataset**: 
- **Permission Level**: Read / Fine-Tune / Admin
- **Supervisor Approval**: Approved
`,
};

export default function NewTicketPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("System Bug");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState(CATEGORY_TEMPLATES["System Bug"]);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savedDraftAlert, setSavedDraftAlert] = useState(false);
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");

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
            const url = await compressAndUploadImage(file, (pct) => setUploadProgress(pct));
            setDescription((prev) => prev + `\n\n![Screenshot](${url})\n`);
          } catch (err) {
            console.error("Paste upload error:", err);
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
      alert("Please sign in first.");
      window.location.href = "/login";
      return;
    }

    const deviceContext = {
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      pageUrl: window.location.href,
      submittedAt: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from("tickets").insert({
      title,
      category,
      priority,
      description,
      author_id: user.id,
      device_context: deviceContext,
    });

    if (insertError) {
      alert("Failed to submit ticket: " + insertError.message);
      setLoading(false);
    } else {
      localStorage.removeItem("ticketing_draft");
      window.location.href = "/tickets";
    }
  };

  return (
    <div className="editorial-shell pb-32 relative">
      <EditorialGrid />
      <Navbar />

      <main className="editorial-content max-w-5xl mx-auto px-6 pt-10 relative z-10 space-y-8">
        <IncidentBanner />

        {savedDraftAlert && (
          <div className="p-3 rounded-2xl bg-[#141416] border border-[#6a9bcc]/30 text-[#d7e6f3] text-xs font-semibold flex items-center justify-between animate-fade-in shadow-xl">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#8db3d6]" />
              <span>Restored auto-saved draft from your previous session.</span>
            </div>
            <button onClick={handleClearDraft} className="text-zinc-500 hover:text-rose-300 underline text-[11px]">
              Clear Draft
            </button>
          </div>
        )}

        {securityWarning && (
          <div className="p-4 rounded-2xl bg-rose-400/10 border border-rose-400/30 text-rose-100 text-sm flex items-start gap-3 shadow-xl">
            <AlertOctagon className="w-5 h-5 shrink-0 text-rose-300 mt-0.5" />
            <div>
              <span className="font-bold block">Sensitive Data Pre-Submit Guard Alert</span>
              <span className="text-xs opacity-90">{securityWarning}</span>
            </div>
          </div>
        )}

        {/* Seamless Notion/Linear Style Canvas */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Borderless Title Input */}
          <div className="space-y-2">
            <div className="editorial-mono mb-3 text-[10px] uppercase tracking-[0.25em] text-zinc-600">STEP 02 / PRESCRIBE A REQUEST</div>
            <input
              type="text"
              placeholder="Title of AI request or bug..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-transparent text-4xl font-light leading-tight tracking-[-0.06em] text-white outline-none placeholder:text-zinc-700 focus:outline-none md:text-6xl"
            />
          </div>

          {/* Interactive Property Pills Bar */}
          <div className="flex flex-wrap items-center gap-2.5 border-b border-white/10 pb-4 pt-2 text-xs">
            {/* Category Selector Pill */}
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#141416] px-3 py-1.5 shadow-xs transition hover:border-white/25">
              <Layers className="w-3.5 h-3.5 text-[#8db3d6]" />
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="bg-transparent font-semibold text-zinc-200 outline-none cursor-pointer"
              >
                <option value="System Bug">⚡ System Bug</option>
                <option value="Hardware">🖥️ Hardware & GPU</option>
                <option value="VPN & Network">🌐 Network & Pipeline</option>
                <option value="Permissions">🔑 Model & Access</option>
              </select>
            </div>

            {/* Priority Selector Pill */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-xs transition ${
              priority === "urgent"
                ? "bg-rose-400/10 border-rose-400/30 text-rose-200 font-bold"
                : "bg-[#141416] border-white/10 text-zinc-300 font-medium"
            }`}>
              <Flame className={`w-3.5 h-3.5 ${priority === "urgent" ? "text-rose-300 animate-pulse" : "text-[#e0a58b]"}`} />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-transparent font-semibold outline-none cursor-pointer"
              >
                <option value="low">Priority: Low</option>
                <option value="medium">Priority: Medium</option>
                <option value="high">Priority: High</option>
                <option value="urgent">Priority: P0 Urgent</option>
              </select>
            </div>

            {/* Auto Device Environment Badge */}
            <div className="editorial-mono flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900 px-3 py-1.5 text-[10px] font-medium text-zinc-500">
              <Monitor className="w-3.5 h-3.5 text-zinc-600" />
              <span>Auto-Context Attached</span>
            </div>

            {/* Guard Badge */}
            <div className="editorial-mono ml-auto flex items-center gap-1.5 rounded-full border border-[#788c5d]/30 bg-[#788c5d]/10 px-3 py-1.5 text-[10px] font-bold text-[#a4b889]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#a4b889]" />
              <span>Data Guard Active</span>
            </div>
          </div>

          {/* Integrated Content Canvas with Floating Toolbar */}
          <div className="editorial-bubble overflow-hidden rounded-2xl">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-2.5 text-xs text-zinc-500">
              <div className="flex items-center gap-3 font-medium">
                <button
                  type="button"
                  onClick={() => setPreviewTab("edit")}
                  className={`rounded-md px-2.5 py-1 transition ${previewTab === "edit" ? "bg-zinc-800 font-bold text-white" : "hover:text-white"}`}
                >
                  Write Markdown
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("preview")}
                  className={`rounded-md px-2.5 py-1 transition ${previewTab === "preview" ? "bg-zinc-800 font-bold text-white" : "hover:text-white"}`}
                >
                  Live Preview
                </button>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-[#8db3d6]" /> Press Ctrl + V to paste screenshot
                </span>
              </div>
            </div>

            {/* Editor Area */}
            {previewTab === "edit" ? (
              <textarea
                rows={14}
                value={description}
                onPaste={handlePaste}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Describe your issue or request in Markdown format..."
                className="w-full bg-transparent p-5 text-sm leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-700 focus:outline-none"
              />
            ) : (
              <div className="min-h-[320px] bg-black/20 p-6 font-mono text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                {description}
              </div>
            )}

            {uploadingImage && (
              <div className="flex items-center gap-2 border-t border-white/10 bg-[#6a9bcc]/10 px-5 py-3 text-xs font-semibold text-[#b9d2e8]">
                <Sparkles className="w-4 h-4 animate-spin text-[#8db3d6]" />
                <span>Compressing & Uploading Screenshot... {uploadProgress}%</span>
              </div>
            )}
          </div>

          {/* Floating Action Dock */}
          <div className="fixed bottom-8 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center justify-between gap-6 rounded-full border border-white/15 bg-[#141416]/95 px-6 py-3 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 text-xs font-medium text-zinc-500">
              <button
                type="button"
                onClick={handleClearDraft}
                className="flex items-center gap-1 text-[11px] transition hover:text-rose-300"
                title="Discard Draft"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="flex items-center gap-2 rounded-full bg-[#6a9bcc] px-6 py-2.5 text-xs font-bold text-zinc-950 shadow-md shadow-blue-600/30 transition hover:bg-[#84add1] disabled:opacity-50"
            >
              <span>Submit to AI Team</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

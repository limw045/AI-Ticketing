"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { IncidentBanner } from "@/components/IncidentBanner";
import { scanSensitiveData } from "@/lib/security-scanner";
import { compressAndUploadImage } from "@/lib/image-upload";
import { ShinyText } from "@/components/react-bits/ShinyText";
import { DotGridBg } from "@/components/react-bits/DotGridBg";
import {
  AlertOctagon, Image as ImageIcon, Send, Sparkles, Monitor, ShieldCheck, Check,
  Cpu, Flame, Layers, Wand2, Trash2, FileText, ArrowRight, CornerDownLeft
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
    <div className="min-h-screen bg-[#fcfcfc] text-zinc-950 pb-32 relative">
      <DotGridBg />
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 pt-10 relative z-10 space-y-8">
        <IncidentBanner />

        {savedDraftAlert && (
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center justify-between animate-fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-blue-600" />
              <span>Restored auto-saved draft from your previous session.</span>
            </div>
            <button onClick={handleClearDraft} className="text-zinc-500 hover:text-red-600 underline text-[11px]">
              Clear Draft
            </button>
          </div>
        )}

        {securityWarning && (
          <div className="p-4.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-start gap-3 shadow-md">
            <AlertOctagon className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
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
            <input
              type="text"
              placeholder="Title of AI request or bug..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full text-3xl md:text-4xl font-extrabold tracking-tight bg-transparent border-none outline-none focus:outline-none placeholder:text-zinc-300 text-zinc-950 leading-tight"
            />
          </div>

          {/* Interactive Property Pills Bar */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 pb-4 border-b border-black/5 text-xs">
            {/* Category Selector Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-black/10 shadow-xs hover:border-black/20 transition">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="bg-transparent font-semibold text-zinc-800 outline-none cursor-pointer"
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
                ? "bg-rose-50 border-rose-200 text-rose-700 font-bold"
                : "bg-white border-black/10 text-zinc-700 font-medium"
            }`}>
              <Flame className={`w-3.5 h-3.5 ${priority === "urgent" ? "text-rose-600 animate-pulse" : "text-amber-500"}`} />
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
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100/70 border border-black/5 text-zinc-500 font-medium text-[11px]">
              <Monitor className="w-3.5 h-3.5 text-zinc-400" />
              <span>Auto-Context Attached</span>
            </div>

            {/* Guard Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px] ml-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Data Guard Active</span>
            </div>
          </div>

          {/* Integrated Content Canvas with Floating Toolbar */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/5 bg-zinc-50/50 text-xs text-zinc-500">
              <div className="flex items-center gap-3 font-medium">
                <button
                  type="button"
                  onClick={() => setPreviewTab("edit")}
                  className={`px-2.5 py-1 rounded-md transition ${previewTab === "edit" ? "bg-white text-zinc-950 font-bold shadow-xs" : "hover:text-zinc-900"}`}
                >
                  Write Markdown
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("preview")}
                  className={`px-2.5 py-1 rounded-md transition ${previewTab === "preview" ? "bg-white text-zinc-950 font-bold shadow-xs" : "hover:text-zinc-900"}`}
                >
                  Live Preview
                </button>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                <span className="flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Press Ctrl + V to paste screenshot
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
                className="w-full p-5 text-sm font-mono focus:outline-none bg-transparent text-zinc-900 leading-relaxed placeholder:text-zinc-300"
              />
            ) : (
              <div className="p-6 min-h-[320px] font-mono text-sm leading-relaxed whitespace-pre-wrap text-zinc-800 bg-zinc-50/30">
                {description}
              </div>
            )}

            {uploadingImage && (
              <div className="px-5 py-3 border-t border-black/5 bg-blue-50/50 text-xs text-blue-700 font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin text-blue-600" />
                <span>Compressing & Uploading Screenshot... {uploadProgress}%</span>
              </div>
            )}
          </div>

          {/* Floating Action Dock */}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-xl border border-black/10 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 max-w-xl w-full justify-between">
            <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium">
              <button
                type="button"
                onClick={handleClearDraft}
                className="hover:text-red-600 transition flex items-center gap-1 text-[11px]"
                title="Discard Draft"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition shadow-md shadow-blue-600/30 flex items-center gap-2"
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

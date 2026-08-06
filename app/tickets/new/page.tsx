"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { IncidentBanner } from "@/components/IncidentBanner";
import { scanSensitiveData } from "@/lib/security-scanner";
import { compressAndUploadImage } from "@/lib/image-upload";
import { GlassSurface } from "@/components/react-bits/GlassSurface";
import { AlertOctagon, FileText, Image as ImageIcon, Send, Sparkles, Monitor, ShieldCheck, Check } from "lucide-react";

const CATEGORY_TEMPLATES: Record<string, string> = {
  "System Bug": `## Bug Overview
- **App / Page URL**: 
- **Expected Result**: 
- **Actual Behavior**: 

### Steps to Reproduce
1. Go to page...
2. Click on...
3. See error...
`,
  "Hardware": `## Hardware Issue Request
- **Device Type**: Laptop / Display / Peripheral
- **Asset S/N**: 
- **Location / Desk**: 

### Symptom Description
`,
  "VPN & Network": `## Network & Connection Issue
- **Location**: Office / Remote
- **Error Code / Message**: 
- **Connection Type**: GlobalProtect / Wi-Fi / Ethernet
`,
  "Permissions": `## Access / Permission Request
- **Target System**: 
- **Role Needed**: Reader / Admin / Developer
- **Manager Approval**: Yes / Pending
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
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 pt-8">
        <IncidentBanner />

        {savedDraftAlert && (
          <div className="mb-4 p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-blue-600" />
            <span>Restored auto-saved draft from your previous session.</span>
          </div>
        )}

        {securityWarning && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-sm flex items-start gap-3 shadow-md">
            <AlertOctagon className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-bold block">Sensitive Data Pre-Submit Alert</span>
              <span className="text-xs opacity-90">{securityWarning}</span>
            </div>
          </div>
        )}

        <GlassSurface showWindowDots title="Create Ticket — GTMSW Portal">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                Ticket Title
              </label>
              <input
                type="text"
                placeholder="Short summary of the issue (e.g. Cannot connect to Office VPN after update)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition text-slate-900 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition text-slate-800 font-medium"
                >
                  <option value="System Bug">System Bug</option>
                  <option value="Hardware">Hardware & Display</option>
                  <option value="VPN & Network">VPN & Network</option>
                  <option value="Permissions">Permissions & Access</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition text-slate-800 font-medium"
                >
                  <option value="low">Low (Standard Request)</option>
                  <option value="medium">Medium (Normal Issue)</option>
                  <option value="high">High (Impacting Work)</option>
                  <option value="urgent">Urgent (P0 Blocking System)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Detailed Description (Markdown)
                </label>
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Tip: Press Ctrl + V anywhere to paste screenshot
                </span>
              </div>
              <textarea
                rows={12}
                value={description}
                onPaste={handlePaste}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:border-blue-500 focus:bg-white transition text-slate-900 leading-relaxed"
              />
              {uploadingImage && (
                <div className="mt-2 text-xs text-blue-600 font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Compressing & Uploading Screenshot... {uploadProgress}%</span>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Auto-captured Device Environment context will be attached for IT diagnostics.</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> Context Safe
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Ticket</span>
            </button>
          </form>
        </GlassSurface>
      </main>
    </div>
  );
}

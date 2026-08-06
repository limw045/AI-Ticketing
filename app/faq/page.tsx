"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { GlassSurface } from "@/components/react-bits/GlassSurface";
import { BlurText } from "@/components/react-bits/BlurText";
import { Search, Pin, HelpCircle, ChevronDown, Plus, Sparkles } from "lucide-react";

const SEED_FAQS = [
  {
    id: "1",
    question: "How do I connect to GTMSW Office VPN from home?",
    answer: "Download GlobalProtect VPN client from https://vpn.gtmsw.com.my. Login using your `@gtmsw.com.my` email and standard password. Ensure 2FA push notification is accepted.",
    category: "VPN & Network",
    is_pinned: true,
  },
  {
    id: "2",
    question: "How can Interns (`@outlook.com`) request software licenses?",
    answer: "Interns must submit a ticket under category 'Permissions & Access' and select your Supervisor's name. Your supervisor will receive an automated approval notification.",
    category: "Permissions",
    is_pinned: true,
  },
  {
    id: "3",
    question: "Printer IP address and driver configuration guide",
    answer: "Office Printers are on IP `192.168.10.250` (Level 3) and `192.168.10.251` (Level 4). Drivers can be installed via Windows Settings -> Add Printer -> Search by IP.",
    category: "Hardware",
    is_pinned: true,
  },
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<any[]>(SEED_FAQS);
  const [searchTerm, setSearchTerm] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string | null>("1");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState("VPN & Network");

  useEffect(() => {
    const fetchFaqs = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setCurrentUser(profile);
      }

      const { data } = await supabase.from("faqs").select("*").order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setFaqs([...SEED_FAQS, ...data]);
      }
    };
    fetchFaqs();
  }, []);

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const supabase = createClient();
    const { data: newFaq } = await supabase
      .from("faqs")
      .insert({
        question: newQuestion,
        answer: newAnswer,
        category: newCategory,
        is_pinned: true,
        created_by: currentUser?.id,
      })
      .select()
      .single();

    if (newFaq) {
      setFaqs((prev) => [newFaq, ...prev]);
    } else {
      setFaqs((prev) => [
        {
          id: Date.now().toString(),
          question: newQuestion,
          answer: newAnswer,
          category: newCategory,
          is_pinned: true,
        },
        ...prev,
      ]);
    }

    setNewQuestion("");
    setNewAnswer("");
    setShowAddForm(false);
  };

  const filteredFaqs = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAgent = currentUser?.role === "support_agent" || currentUser?.role === "admin";

  return (
    <div className="min-h-screen bg-mac-bg text-zinc-100 pb-16">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 pt-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <BlurText text="Q&A Knowledge Base" className="text-3xl font-bold tracking-tight" />
            <p className="text-xs text-zinc-400 mt-1">
              Search high-frequency solutions before opening a new ticket.
            </p>
          </div>

          {isAgent && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Pin New Q&A
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Search keywords (e.g. VPN, Printer, Intern permission)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none text-zinc-200 placeholder:text-zinc-600"
          />
        </div>

        {/* Admin Add FAQ Form */}
        {showAddForm && (
          <GlassSurface showWindowDots title="Pin New Q&A to Knowledge Base">
            <form onSubmit={handleAddFaq} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">Question / Title</label>
                <input
                  type="text"
                  placeholder="e.g. How to set up printer drivers on Windows 11?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-200"
                >
                  <option value="VPN & Network">VPN & Network</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Permissions">Permissions</option>
                  <option value="System Bug">System Bug</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">Detailed Answer (Markdown)</label>
                <textarea
                  rows={4}
                  placeholder="Steps to resolve..."
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition"
              >
                Publish Pinned Q&A
              </button>
            </form>
          </GlassSurface>
        )}

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.map((faq) => {
            const isOpen = openFaqId === faq.id;

            return (
              <div
                key={faq.id}
                className="glass-panel rounded-2xl overflow-hidden border border-zinc-800/80 transition"
              >
                <button
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-zinc-900/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <Pin className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">{faq.question}</h3>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">{faq.category}</span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-2 border-t border-zinc-800/60 bg-zinc-950/40 text-xs font-mono leading-relaxed text-zinc-300 whitespace-pre-wrap">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

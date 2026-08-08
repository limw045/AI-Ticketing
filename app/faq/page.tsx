"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { GlassSurface } from "@/components/react-bits/GlassSurface";
import { EditorialGrid } from "@/components/EditorialGrid";
import { BlurText } from "@/components/react-bits/BlurText";
import { ChevronDown, Pin, Plus, Search } from "lucide-react";

const SEED_FAQS = [
  { id: "1", question: "How do I connect to the GTMSW Office VPN from home?", answer: "Download GlobalProtect from the company portal, sign in with your GTMSW address, then approve the 2FA prompt.", category: "Network" },
  { id: "2", question: "How do I request access to an AI model or dataset?", answer: "Create a request under Model & Access and include the model name, permission level, use case, and supervisor approval.", category: "Access" },
  { id: "3", question: "How do I request GPU cluster access?", answer: "Choose Hardware & GPU, include the workload, framework, GPU type, expected duration, and repository or dataset location.", category: "Compute" },
];

export default function FAQPage() {
  const router = useRouter();
  const [faqs, setFaqs] = useState<any[]>(SEED_FAQS);
  const [searchTerm, setSearchTerm] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string | null>("1");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState("Network");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFaqs = async () => {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace("/login");
        return;
      }
      if (user) {
        const { data: profile, error: profileError } = await supabase.from("profiles").select("id, role, account_status").eq("id", user.id).single();
        if (profileError) setError(`Could not load profile: ${profileError.message}`);
        setCurrentUser(profile);
      }
      const { data, error: faqError } = await supabase.from("faqs").select("id, question, answer, category, is_pinned, created_at").order("created_at", { ascending: false });
      if (faqError) setError(`Could not load saved answers: ${faqError.message}`);
      if (data?.length) setFaqs([...SEED_FAQS, ...data]);
    };
    fetchFaqs();
  }, [router]);

  const handleAddFaq = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    const supabase = createClient();
    const { data, error: insertError } = await supabase.from("faqs").insert({ question: newQuestion, answer: newAnswer, category: newCategory, is_pinned: true, created_by: currentUser?.id }).select("id, question, answer, category, is_pinned, created_at").single();
    if (insertError || !data) {
      setError(`Could not publish answer: ${insertError?.message || "Database did not return the saved answer."}`);
      return;
    }
    setFaqs((previous) => [data, ...previous]);
    setNewQuestion("");
    setNewAnswer("");
    setShowAddForm(false);
  };

  const filteredFaqs = faqs.filter((faq) => `${faq.question} ${faq.answer} ${faq.category}`.toLowerCase().includes(searchTerm.toLowerCase()));
  const isAgent = currentUser?.role === "support_agent" || currentUser?.role === "admin";

  return (
    <div className="editorial-shell pb-20">
      <EditorialGrid />
      <Navbar />
      <main className="editorial-content mx-auto max-w-5xl space-y-8 px-6 pt-12">
        {error && <div role="alert" className="border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-xs text-rose-200">{error}</div>}
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-10 lg:grid-cols-[1fr_1.3fr] lg:items-end">
          <div>
            <div className="editorial-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">STEP 03 / DIFFERENCE</div>
            <BlurText text="Answers before tickets." className="mt-4 text-5xl font-light tracking-[-0.06em] text-white" />
          </div>
          <div className="flex items-end justify-between gap-6">
            <p className="max-w-md text-sm leading-7 text-zinc-500">Search the operating knowledge of the AI team before you open a new request.</p>
            {isAgent && <button onClick={() => setShowAddForm(!showAddForm)} className="flex shrink-0 items-center gap-2 rounded-full bg-[#6a9bcc] px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-[#84add1]"><Plus className="h-4 w-4" /> Pin answer</button>}
          </div>
        </div>

        <div className="editorial-bubble flex items-center gap-3 px-4 py-3">
          <Search className="h-4 w-4 text-zinc-600" />
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search VPN, models, GPUs, datasets..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-700" />
          <span className="editorial-mono text-[10px] text-zinc-600">/ SEARCH</span>
        </div>

        {showAddForm && <GlassSurface showWindowDots title="PIN ANSWER / ADMIN">
          <form onSubmit={handleAddFaq} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input required value={newQuestion} onChange={(event) => setNewQuestion(event.target.value)} placeholder="Question" className="border border-white/10 bg-[#0a0a0c] px-4 py-3 text-xs text-white outline-none focus:border-[#6a9bcc] md:col-span-2" />
            <select value={newCategory} onChange={(event) => setNewCategory(event.target.value)} className="border border-white/10 bg-[#0a0a0c] px-4 py-3 text-xs text-white outline-none focus:border-[#6a9bcc]"><option>Network</option><option>Access</option><option>Compute</option><option>Bug</option></select>
            <button className="rounded-full bg-[#6a9bcc] px-4 py-3 text-xs font-bold text-zinc-950">Publish pinned answer</button>
            <textarea required value={newAnswer} onChange={(event) => setNewAnswer(event.target.value)} placeholder="Resolution steps" rows={4} className="border border-white/10 bg-[#0a0a0c] p-4 text-xs text-white outline-none focus:border-[#6a9bcc] md:col-span-2" />
          </form>
        </GlassSurface>}

        <div className="divide-y divide-white/10 border-y border-white/10">
          {filteredFaqs.map((faq, index) => {
            const isOpen = openFaqId === faq.id;
            return <div key={faq.id}>
              <button onClick={() => setOpenFaqId(isOpen ? null : faq.id)} className="grid w-full grid-cols-[4rem_1fr_auto] items-center gap-4 py-6 text-left transition hover:bg-white/[0.02]">
                <span className="editorial-mono text-xs text-zinc-600">0{index + 1}</span>
                <span><span className="block text-lg font-light tracking-tight text-white">{faq.question}</span><span className="editorial-mono mt-2 block text-[10px] uppercase tracking-widest text-zinc-600">{faq.category}</span></span>
                <span className="flex items-center gap-3"><Pin className="h-4 w-4 text-[#e0a58b]" /><ChevronDown className={`h-4 w-4 text-zinc-600 transition ${isOpen ? "rotate-180" : ""}`} /></span>
              </button>
              {isOpen && <div className="ml-16 max-w-2xl border-l border-white/10 pb-7 pl-5 text-sm leading-7 text-zinc-400">{faq.answer}</div>}
            </div>;
          })}
        </div>
      </main>
    </div>
  );
}

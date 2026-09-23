"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button, FieldLabel, Input, Select, Textarea } from "@/components/ui/FormField";
import { ChevronDown, Pin, Plus, Search } from "lucide-react";
import { cn } from "@/lib/cn";

const SEED_FAQS = [
  {
    id: "1",
    question: "How do I connect to the GTMSW Office VPN from home?",
    answer:
      "Download GlobalProtect from the company portal, sign in with your GTMSW address, then approve the 2FA prompt.",
    category: "Network",
  },
  {
    id: "2",
    question: "How do I request access to an AI model or dataset?",
    answer:
      "Create a request under Model & Access and include the model name, permission level, use case, and supervisor approval.",
    category: "Access",
  },
  {
    id: "3",
    question: "How do I request GPU cluster access?",
    answer:
      "Choose Hardware & GPU, include the workload, framework, GPU type, expected duration, and repository or dataset location.",
    category: "Compute",
  },
];

export default function FAQPage() {
  const router = useRouter();
  const [faqs, setFaqs] = useState<any[]>(SEED_FAQS);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All topics");
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
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, role, account_status")
          .eq("id", user.id)
          .single();
        if (profileError) setError(`Could not load profile: ${profileError.message}`);
        setCurrentUser(profile);
      }
      const { data, error: faqError } = await supabase
        .from("faqs")
        .select("id, question, answer, category, is_pinned, created_at")
        .order("created_at", { ascending: false });
      if (faqError) setError(`Could not load saved answers: ${faqError.message}`);
      if (data?.length) setFaqs([...SEED_FAQS, ...data]);
    };
    fetchFaqs();
  }, [router]);

  const handleAddFaq = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("faqs")
      .insert({
        question: newQuestion,
        answer: newAnswer,
        category: newCategory,
        is_pinned: true,
        created_by: currentUser?.id,
      })
      .select("id, question, answer, category, is_pinned, created_at")
      .single();
    if (insertError || !data) {
      setError(
        `Could not publish answer: ${
          insertError?.message || "Database did not return the saved answer."
        }`
      );
      return;
    }
    setFaqs((previous) => [data, ...previous]);
    setNewQuestion("");
    setNewAnswer("");
    setShowAddForm(false);
  };

  const filteredFaqs = faqs.filter((faq) =>
    (activeCategory === "All topics" || faq.category === activeCategory) && `${faq.question} ${faq.answer} ${faq.category}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );
  const isAgent =
    currentUser?.role === "admin" || currentUser?.role === "super_admin";

  return (
    <div className="space-y-10">
      {error && (
        <Alert tone="error" role="alert">
          {error}
        </Alert>
      )}

      <PageHeader
        eyebrow="Knowledge"
        title="Knowledge"
        description="Search the operating knowledge of the AI team before you open a new request."
        actions={
          isAgent && (
            <Button
              type="button"
              variant={showAddForm ? "secondary" : "primary"}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="h-4 w-4" /> Publish answer
            </Button>
          )
        }
      />

      <div className="knowledge-search surface flex items-center gap-3 px-4 py-3">
        <Search className="h-4 w-4 text-[var(--faint)]" />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          aria-label="Search Knowledge"
          placeholder="Search VPN, models, GPUs, datasets..."
          className="min-h-11 w-full bg-transparent text-base text-[var(--ink)] outline-none placeholder:text-[var(--faint)] sm:text-sm"
        />
        <span className="hidden font-mono text-xs text-[var(--faint)] sm:inline">
          / SEARCH
        </span>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddFaq}
          className="surface grid grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-2"
        >
          <div className="md:col-span-2">
            <FieldLabel>Question</FieldLabel>
            <Input
              required
              value={newQuestion}
              onChange={(event) => setNewQuestion(event.target.value)}
              placeholder="Question"
            />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <Select
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
            >
              <option>Network</option>
              <option>Access</option>
              <option>Compute</option>
              <option>Bug</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Publish pinned answer
            </Button>
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Resolution steps</FieldLabel>
            <Textarea
              required
              value={newAnswer}
              onChange={(event) => setNewAnswer(event.target.value)}
              placeholder="Resolution steps"
              rows={4}
            />
          </div>
        </form>
      )}

      <div className="knowledge-categories" role="group" aria-label="Knowledge topics">{["All topics", ...Array.from(new Set(faqs.map(faq => faq.category)))].map(category => <button type="button" key={category} aria-pressed={activeCategory === category} onClick={() => setActiveCategory(category)}>{category}</button>)}</div>
      {filteredFaqs.length === 0 && <div className="surface p-8 text-center"><h2 className="font-display text-lg">No answers found</h2><p className="mt-2 text-sm text-[var(--muted)]">Try a different topic or a broader search.</p><button type="button" className="mt-4 text-sm text-[var(--brand-ink)]" onClick={() => {setSearchTerm("");setActiveCategory("All topics");}}>Clear filters</button></div>}
      <div className="knowledge-list divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {filteredFaqs.map((faq, index) => {
          const isOpen = openFaqId === faq.id;
          return (
            <div key={faq.id}>
              <button
                onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                aria-expanded={isOpen}
                className="grid min-h-[72px] w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 px-2 py-5 text-left transition hover:bg-[var(--surface-2)] sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-4 sm:px-0 sm:py-6"
              >
                <span className="font-mono text-xs text-[var(--faint)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-base font-semibold tracking-tight text-[var(--ink)]">
                    {faq.question}
                  </span>
                  <span className="mt-1.5 block font-mono text-xs font-semibold uppercase tracking-[var(--tracking-eyebrow)] text-[var(--muted)]">
                    {faq.category}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {faq.is_pinned && (
                    <><Pin className="h-4 w-4 text-[var(--brand-ink)]" aria-hidden="true" /><span className="sr-only">Pinned answer</span></>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-[var(--faint)] transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </span>
              </button>
              {isOpen && (
                <div className="ml-8 max-w-2xl border-l-2 border-[var(--brand-soft)] pb-7 pl-4 pr-2 text-sm leading-7 text-[var(--muted)] sm:ml-16 sm:pl-5">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { BookOpen, Workflow } from "lucide-react";
import { SimpleCrudPage } from "@/components/admin/SimpleCrudPage";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AdminKnowledgePage() {
  const [tab, setTab] = useState<"faqs" | "rules">("faqs");
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Knowledge"
        description="Manage staff answers and the category rules used to route new requests."
      />
      <div className="surface inline-flex gap-1 p-1">
        <button
          type="button"
          onClick={() => setTab("faqs")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === "faqs" ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
        >
          <BookOpen className="h-4 w-4" /> FAQs
        </button>
        <button
          type="button"
          onClick={() => setTab("rules")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === "rules" ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
        >
          <Workflow className="h-4 w-4" /> Category rules
        </button>
      </div>
      {tab === "faqs" ? (
        <SimpleCrudPage
          compact
          resource="faqs"
          title="FAQs"
          description="Answers shown in the employee Knowledge page."
          columns={[
            { key: "question", label: "Question" },
            { key: "answer", label: "Answer", format: "truncate" },
            { key: "category", label: "Category" },
            { key: "is_pinned", label: "Pinned", format: "boolean" },
            { key: "updated_at", label: "Updated", format: "date" },
          ]}
          fields={[
            { key: "question", label: "Question", required: true },
            { key: "category", label: "Category", required: true },
            { key: "answer", label: "Answer", type: "textarea", required: true },
            { key: "is_pinned", label: "Pinned", type: "checkbox", defaultValue: true },
          ]}
          filters={[
            {
              key: "is_pinned",
              label: "Pinned state",
              options: [
                { label: "Pinned", value: "true" },
                { label: "Not pinned", value: "false" },
              ],
            },
          ]}
        />
      ) : (
        <SimpleCrudPage
          compact
          resource="category-rules"
          title="Category rules"
          description="Default request templates and assignee routing."
          columns={[
            { key: "category_name", label: "Category" },
            { key: "template_markdown", label: "Template", format: "truncate" },
            { key: "default_assignee.display_name", label: "Default assignee" },
            { key: "updated_at", label: "Updated", format: "date" },
          ]}
          fields={[
            { key: "category_name", label: "Category name", required: true },
            { key: "default_assignee_id", label: "Default assignee ID", placeholder: "Optional Admin UUID" },
            {
              key: "template_markdown",
              label: "Request guidance",
              type: "textarea",
              placeholder: "Tell staff what information to provide. Do not include code, credentials, or sensitive data.",
            },
          ]}
        />
      )}
    </div>
  );
}

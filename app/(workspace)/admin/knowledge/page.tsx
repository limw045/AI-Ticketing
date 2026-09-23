"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/Alert";
import { BookOpen, Workflow } from "lucide-react";
import { SimpleCrudPage } from "@/components/admin/SimpleCrudPage";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AdminKnowledgePage() {
  const [tab, setTab] = useState<"faqs" | "rules">("faqs");
  const [assignees, setAssignees] = useState<{ label: string; value: string }[]>([]);
  const [assigneeError, setAssigneeError] = useState("");
  const [assigneesLoading, setAssigneesLoading] = useState(true);
  const [assigneeRetry, setAssigneeRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setAssigneesLoading(true);
    setAssigneeError("");
    void createClient().from("profiles").select("id, display_name, email")
      .in("role", ["admin", "super_admin"]).eq("account_status", "active")
      .is("deleted_at", null).order("display_name")
      .then(({ data, error }) => {
        if (!active) return;
        setAssigneesLoading(false);
        if (error) { setAssigneeError("Could not load administrators. Retry to select a default assignee."); return; }
        setAssignees((data ?? []).map((person) => ({ value: person.id, label: person.display_name ? `${person.display_name} (${person.email})` : person.email })));
      });
    return () => { active = false; };
  }, [assigneeRetry]);
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
      {tab === "rules" && assigneeError && <Alert tone="error">{assigneeError} <button type="button" className="underline" onClick={() => setAssigneeRetry((value) => value + 1)}>Retry</button></Alert>}
      {tab === "faqs" ? (
        <SimpleCrudPage
          compact
          resource="faqs"
          title="FAQs"
          itemName="answer"
          description="Answers shown in the employee Knowledge page."
          emptyDescription="Publish an answer to help staff resolve common requests."
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
              label: "Pin status",
              allLabel: "All",
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
          itemName="category rule"
          description="Default request templates and assignee routing."
          emptyDescription="Add a category rule to guide and route new requests."
          columns={[
            { key: "category_name", label: "Category" },
            { key: "template_markdown", label: "Template", format: "truncate" },
            { key: "default_assignee.display_name", label: "Default assignee" },
            { key: "updated_at", label: "Updated", format: "date" },
          ]}
          fields={[
            { key: "category_name", label: "Category name", required: true },
            {
              key: "default_assignee_id", label: "Default assignee", type: "select",
              disabled: assigneesLoading || Boolean(assigneeError),
              options: [{ value: "", label: assigneesLoading ? "Loading administrators…" : "Unassigned" }, ...assignees],
            },
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

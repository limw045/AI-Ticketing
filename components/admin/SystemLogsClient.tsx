"use client";

import { useState } from "react";
import { Activity, Bell, Braces } from "lucide-react";
import { ReadOnlyLogTable } from "@/components/admin/ReadOnlyLogTable";
import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { PageHeader } from "@/components/ui/PageHeader";

export function SystemLogsClient() {
  const [tab, setTab] = useState<"activity" | "api" | "notifications">("activity");
  const tabs = [
    { id: "activity" as const, label: "Audit log", icon: Activity },
    { id: "api" as const, label: "API requests", icon: Braces },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
  ];
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Super Administration" title="System logs" description="Filter immutable administrative activity, API request records, and notification delivery data." />
      <div className="surface inline-flex flex-wrap gap-1 p-1">{tabs.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === item.id ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}><Icon className="h-4 w-4" /> {item.label}</button>; })}</div>
      {tab === "activity" && <AuditLogTable />}
      {tab === "api" && <ReadOnlyLogTable resource="api-request-logs" columns={[{ key: "client.name", label: "Client" }, { key: "ticket.ticket_number", label: "Ticket" }, { key: "idempotency_key", label: "Idempotency key" }, { key: "created_at", label: "Time", date: true }]} />}
      {tab === "notifications" && <ReadOnlyLogTable resource="notifications" columns={[{ key: "recipient.display_name", label: "Recipient" }, { key: "kind", label: "Kind" }, { key: "title", label: "Title" }, { key: "ticket.ticket_number", label: "Ticket" }, { key: "read_at", label: "Read", date: true }, { key: "created_at", label: "Created", date: true }]} filters={[{ key: "kind", label: "Kind", allLabel: "All kinds", options: [{ label: "New ticket", value: "new_ticket" }, { label: "Comment", value: "comment" }, { label: "Status", value: "status" }, { label: "Assignment", value: "assignment" }] }]} />}
    </div>
  );
}

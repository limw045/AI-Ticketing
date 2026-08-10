"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge, severityTone } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import {
  Button,
  FieldLabel,
  Input,
  Select,
  Textarea,
} from "@/components/ui/FormField";
import {
  AdminTable,
  AdminThead,
  AdminTh,
  AdminTd,
  TwoStepDelete,
} from "@/components/admin/table";
import { Pencil, Check, X, Plus } from "lucide-react";

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newSeverity, setNewSeverity] = useState("warning");
  const [newActive, setNewActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editSeverity, setEditSeverity] = useState("warning");
  const [submitting, setSubmitting] = useState(false);

  const fetchIncidents = useCallback(async () => {
    setError("");
    const supabase = createClient();
    const { data, error: loadError } = await supabase
      .from("incidents")
      .select("*")
      .order("created_at", { ascending: false });
    if (loadError) setError(`Could not load incidents: ${loadError.message}`);
    else setIncidents(data ?? []);
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;
    setSubmitting(true);
    setError("");
    const supabase = createClient();
    const { error: insertError } = await supabase.from("incidents").insert({
      title: newTitle.trim(),
      message: newMessage.trim(),
      severity: newSeverity,
      is_active: newActive,
    });
    setSubmitting(false);
    if (insertError) {
      setError(`Could not add incident: ${insertError.message}`);
      return;
    }
    setNewTitle("");
    setNewMessage("");
    setNewSeverity("warning");
    setNewActive(true);
    fetchIncidents();
  };

  const startEdit = (incident: any) => {
    setEditingId(incident.id);
    setEditTitle(incident.title);
    setEditMessage(incident.message);
    setEditSeverity(incident.severity);
  };

  const saveEdit = async (id: string) => {
    if (!editTitle.trim() || !editMessage.trim()) return;
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("incidents")
      .update({
        title: editTitle.trim(),
        message: editMessage.trim(),
        severity: editSeverity,
      })
      .eq("id", id);
    if (updateError) {
      setError(`Could not save changes: ${updateError.message}`);
      return;
    }
    setEditingId(null);
    fetchIncidents();
  };

  const toggleActive = async (id: string, current: boolean) => {
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("incidents")
      .update({ is_active: !current })
      .eq("id", id);
    if (updateError) {
      setError(`Could not toggle incident: ${updateError.message}`);
      return;
    }
    fetchIncidents();
  };

  const deleteIncident = async (id: string) => {
    setError("");
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("incidents")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(`Could not delete incident: ${deleteError.message}`);
      return;
    }
    fetchIncidents();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Incidents"
        description="Publish, edit, and remove the global outage banners every staff member sees."
      />

      {error && (
        <Alert tone="error" role="alert">
          {error}
        </Alert>
      )}

      <section className="surface p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-soft)] font-mono text-[11px] font-bold text-[var(--brand-ink)]">
            <Plus className="h-3.5 w-3.5" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold">Add incident</h2>
            <p className="text-xs text-[var(--muted)]">
              Banners appear at the top of every workspace page while active.
            </p>
          </div>
        </div>
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <FieldLabel>Title</FieldLabel>
            <Input
              type="text"
              placeholder="Incident title (e.g. Office Wi-Fi Degradation)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <FieldLabel>Message</FieldLabel>
            <Input
              type="text"
              placeholder="Announcement message for staff..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              required
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <FieldLabel>Severity</FieldLabel>
              <Select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value)}
              >
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
                <option value="info">Information</option>
              </Select>
            </div>
            <Button type="submit" disabled={submitting} className="shrink-0">
              Add
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--muted)] md:col-span-3">
            <input
              type="checkbox"
              checked={newActive}
              onChange={(e) => setNewActive(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--line-strong)] text-[var(--brand)] focus:ring-[var(--brand-soft)]"
            />
            Publish immediately (active on save)
          </label>
        </form>
      </section>

      <AdminTable
        header={
          <>
            <h2 className="font-display text-base font-bold">All incidents</h2>
            <StatusBadge tone="neutral">{incidents.length} total</StatusBadge>
          </>
        }
      >
        <AdminThead>
          <AdminTh>Title</AdminTh>
          <AdminTh>Message</AdminTh>
          <AdminTh>Severity</AdminTh>
          <AdminTh>Status</AdminTh>
          <AdminTh>Created</AdminTh>
          <AdminTh className="text-right">Actions</AdminTh>
        </AdminThead>
        <tbody className="divide-y divide-[var(--line)]">
          {incidents.map((incident) => {
            const isEditing = editingId === incident.id;
            return (
              <tr key={incident.id} className="transition hover:bg-[var(--surface-2)]">
                <AdminTd>
                  {isEditing ? (
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="min-w-[180px]"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-[var(--ink)]">
                      {incident.title}
                    </span>
                  )}
                </AdminTd>
                <AdminTd>
                  {isEditing ? (
                    <Textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      rows={2}
                      className="min-w-[240px]"
                    />
                  ) : (
                    <span className="block max-w-[320px] truncate text-xs text-[var(--muted)]">
                      {incident.message}
                    </span>
                  )}
                </AdminTd>
                <AdminTd>
                  {isEditing ? (
                    <Select
                      value={editSeverity}
                      onChange={(e) => setEditSeverity(e.target.value)}
                      className="!w-auto"
                    >
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                      <option value="info">Information</option>
                    </Select>
                  ) : (
                    <StatusBadge tone={severityTone(incident.severity)}>
                      {incident.severity}
                    </StatusBadge>
                  )}
                </AdminTd>
                <AdminTd>
                  <button
                    type="button"
                    onClick={() => toggleActive(incident.id, incident.is_active)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      incident.is_active
                        ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                        : "bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {incident.is_active ? "Active" : "Inactive"}
                  </button>
                </AdminTd>
                <AdminTd className="whitespace-nowrap font-mono text-[11px] text-[var(--faint)]">
                  {new Date(incident.created_at).toLocaleDateString()}
                </AdminTd>
                <AdminTd className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          variant="primary"
                          className="!px-3 !py-1.5 !text-xs"
                          onClick={() => saveEdit(incident.id)}
                        >
                          <Check className="h-3.5 w-3.5" /> Save
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="!px-3 !py-1.5 !text-xs"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-3 !py-1.5 !text-xs"
                        onClick={() => startEdit(incident)}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    )}
                    <TwoStepDelete onConfirm={() => deleteIncident(incident.id)} />
                  </div>
                </AdminTd>
              </tr>
            );
          })}
        </tbody>
      </AdminTable>
      {incidents.length === 0 && (
        <p className="text-center text-xs text-[var(--faint)]">
          No incidents yet. Add one above to publish the first banner.
        </p>
      )}
    </div>
  );
}

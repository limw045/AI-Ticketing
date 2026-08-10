"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button, FieldLabel, Input } from "@/components/ui/FormField";
import {
  AdminTable,
  AdminThead,
  AdminTh,
  AdminTd,
} from "@/components/admin/table";
import { Pencil, Check, X, Plus, KeyRound } from "lucide-react";

export default function AdminApiClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [clientName, setClientName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = useCallback(async () => {
    setError("");
    const supabase = createClient();
    const { data, error: loadError } = await supabase
      .from("api_clients")
      .select("id, name, is_active, created_at, last_used_at")
      .order("created_at", { ascending: false });
    if (loadError) setError(`Could not load API clients: ${loadError.message}`);
    else setClients(data ?? []);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    setSubmitting(true);
    setError("");
    setGeneratedKey("");
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_api_client", {
      client_name: clientName.trim(),
    });
    setSubmitting(false);
    if (rpcError || !data?.api_key) {
      setError(
        `Could not create API client: ${
          rpcError?.message || "No key was returned."
        }`
      );
      return;
    }
    setGeneratedKey(data.api_key);
    setClientName("");
    await fetchClients();
  };

  const startEdit = (client: any) => {
    setEditingId(client.id);
    setEditName(client.name);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("api_clients")
      .update({ name: editName.trim() })
      .eq("id", id);
    if (updateError) {
      setError(`Could not rename client: ${updateError.message}`);
      return;
    }
    setEditingId(null);
    fetchClients();
  };

  const toggleActive = async (id: string, current: boolean) => {
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("api_clients")
      .update({ is_active: !current })
      .eq("id", id);
    if (updateError) {
      setError(`Could not update client: ${updateError.message}`);
      return;
    }
    fetchClients();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="API clients"
        description="Keys for internal apps to file tickets. Create, rename, or revoke access — revoked keys can be re-enabled, but a generated key is only shown once."
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
            <h2 className="font-display text-base font-bold">Create client</h2>
            <p className="text-xs text-[var(--muted)]">
              The generated key is shown once and cannot be recovered.
            </p>
          </div>
        </div>
        <form onSubmit={handleCreate} className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <FieldLabel>App name</FieldLabel>
            <Input
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="App name, e.g. Model Gateway"
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={submitting}>
              <KeyRound className="h-4 w-4" /> Generate API key
            </Button>
          </div>
        </form>
        {generatedKey && (
          <div className="mt-4 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-4 text-sm text-[var(--warning)]">
            <strong className="block">
              Copy this key now. It cannot be shown again.
            </strong>
            <code className="mt-2 block select-all break-all font-mono text-xs">
              {generatedKey}
            </code>
          </div>
        )}
      </section>

      <AdminTable
        header={
          <>
            <h2 className="font-display text-base font-bold">All clients</h2>
            <StatusBadge tone="neutral">{clients.length} total</StatusBadge>
          </>
        }
      >
        <AdminThead>
          <AdminTh>Name</AdminTh>
          <AdminTh>Status</AdminTh>
          <AdminTh>Last used</AdminTh>
          <AdminTh>Created</AdminTh>
          <AdminTh className="text-right">Actions</AdminTh>
        </AdminThead>
        <tbody className="divide-y divide-[var(--line)]">
          {clients.map((client) => {
            const isEditing = editingId === client.id;
            return (
              <tr key={client.id} className="transition hover:bg-[var(--surface-2)]">
                <AdminTd>
                  {isEditing ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="min-w-[180px]"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-[var(--ink)]">
                      {client.name}
                    </span>
                  )}
                </AdminTd>
                <AdminTd>
                  <button
                    type="button"
                    onClick={() => toggleActive(client.id, client.is_active)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      client.is_active
                        ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : "bg-[var(--surface-3)] text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    {client.is_active ? "Active" : "Revoked"}
                  </button>
                </AdminTd>
                <AdminTd className="font-mono text-xs text-[var(--muted)]">
                  {client.last_used_at
                    ? new Date(client.last_used_at).toLocaleString()
                    : "Never"}
                </AdminTd>
                <AdminTd className="whitespace-nowrap font-mono text-[11px] text-[var(--faint)]">
                  {new Date(client.created_at).toLocaleDateString()}
                </AdminTd>
                <AdminTd className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          variant="primary"
                          className="!px-3 !py-1.5 !text-xs"
                          onClick={() => saveEdit(client.id)}
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
                        onClick={() => startEdit(client)}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Rename
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleActive(client.id, client.is_active)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                        client.is_active
                          ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                          : "bg-[var(--success-soft)] text-[var(--success)]"
                      }`}
                    >
                      {client.is_active ? "Revoke" : "Re-enable"}
                    </button>
                  </div>
                </AdminTd>
              </tr>
            );
          })}
        </tbody>
      </AdminTable>
      {clients.length === 0 && (
        <p className="text-center text-xs text-[var(--faint)]">
          No API clients yet. Create the first key above.
        </p>
      )}
    </div>
  );
}

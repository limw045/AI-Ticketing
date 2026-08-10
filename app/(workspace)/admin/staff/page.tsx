"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button, Select } from "@/components/ui/FormField";
import {
  AdminTable,
  AdminThead,
  AdminTh,
  AdminTd,
} from "@/components/admin/table";
import { UserPlus } from "lucide-react";

export default function AdminStaffPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    const { data, error: loadError } = await supabase
      .from("profiles")
      .select(
        "id, display_name, email, department, user_type, role, account_status, created_at"
      )
      .order("created_at", { ascending: true });
    if (loadError) setError(`Could not load staff: ${loadError.message}`);
    else setUsers(data ?? []);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUser = async (
    userId: string,
    changes: { role?: string; account_status?: string }
  ) => {
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update(changes)
      .eq("id", userId);
    if (updateError) {
      setError(`Account update failed: ${updateError.message}`);
      return;
    }
    fetchUsers();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Administration"
        title="Staff access & roles"
        description="Manage who can work the desk. Accounts are created through registration; here you adjust roles and account status."
      />

      {error && (
        <Alert tone="error" role="alert">
          {error}
        </Alert>
      )}

      <section className="surface flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)]">
            <UserPlus className="h-4 w-4 text-[var(--brand-ink)]" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold">Add staff</h2>
            <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
              Staff and interns register with their GTMSW or Outlook account.
              Share the registration link to invite new members.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <code className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 font-mono text-[11px] text-[var(--muted)]">
            {typeof window !== "undefined"
              ? `${window.location.origin}/register`
              : "/register"}
          </code>
          <Link href="/register">
            <Button variant="secondary">
              <UserPlus className="h-4 w-4" /> Open registration
            </Button>
          </Link>
        </div>
      </section>

      <AdminTable
        header={
          <>
            <h2 className="font-display text-base font-bold">All staff</h2>
            <StatusBadge tone="neutral">{users.length} accounts</StatusBadge>
          </>
        }
      >
        <AdminThead>
          <AdminTh>Name</AdminTh>
          <AdminTh>Department</AdminTh>
          <AdminTh>Type</AdminTh>
          <AdminTh>Role</AdminTh>
          <AdminTh>Status</AdminTh>
          <AdminTh>Joined</AdminTh>
        </AdminThead>
        <tbody className="divide-y divide-[var(--line)]">
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <tr key={user.id} className="transition hover:bg-[var(--surface-2)]">
                <AdminTd>
                  <span className="block text-sm font-semibold text-[var(--ink)]">
                    {user.display_name}
                    {isSelf && (
                      <span className="ml-2 rounded-full bg-[var(--brand-soft)] px-2 py-0.5 font-mono text-[9px] font-bold text-[var(--brand-ink)]">
                        You
                      </span>
                    )}
                  </span>
                  <span className="block font-mono text-[11px] text-[var(--faint)]">
                    {user.email}
                  </span>
                </AdminTd>
                <AdminTd className="text-xs text-[var(--muted)]">
                  {user.department}
                </AdminTd>
                <AdminTd>
                  <StatusBadge
                    tone={user.user_type === "intern" ? "warning" : "neutral"}
                  >
                    {user.user_type === "intern" ? "Intern" : "Staff"}
                  </StatusBadge>
                </AdminTd>
                <AdminTd>
                  <Select
                    value={user.role}
                    disabled={isSelf}
                    onChange={(event) =>
                      updateUser(user.id, { role: event.target.value })
                    }
                    className="!w-auto !py-2 !text-xs"
                  >
                    <option value="employee">Employee</option>
                    <option value="support_agent">Support agent</option>
                    <option value="admin">Admin</option>
                  </Select>
                  {isSelf && (
                    <p className="mt-1 font-mono text-[9px] text-[var(--faint)]">
                      Cannot change own role
                    </p>
                  )}
                </AdminTd>
                <AdminTd>
                  <Select
                    value={user.account_status}
                    disabled={isSelf}
                    onChange={(event) =>
                      updateUser(user.id, {
                        account_status: event.target.value,
                      })
                    }
                    className={`!w-auto !py-2 !text-xs ${
                      user.account_status === "suspended"
                        ? "!border-[var(--danger)]/40 !text-[var(--danger)]"
                        : ""
                    }`}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </Select>
                </AdminTd>
                <AdminTd className="whitespace-nowrap font-mono text-[11px] text-[var(--faint)]">
                  {new Date(user.created_at).toLocaleDateString()}
                </AdminTd>
              </tr>
            );
          })}
        </tbody>
      </AdminTable>
      {users.length === 0 && (
        <p className="text-center text-xs text-[var(--faint)]">
          No staff profiles yet. Accounts appear after staff and interns
          register.
        </p>
      )}
    </div>
  );
}

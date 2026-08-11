"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { exportTicketPDF } from "@/lib/pdf-export";
import {
  StatusBadge,
  statusTone,
  priorityTone,
} from "@/components/ui/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { TicketAttachments } from "@/components/tickets/TicketAttachments";
import { parseTicketDescription } from "@/lib/ticket-attachments";
import {
  Button,
  FieldLabel,
  Select,
  Textarea,
  Input,
} from "@/components/ui/FormField";
import {
  User,
  Lock,
  Send,
  Plus,
  CheckSquare,
  Square,
  Download,
  Monitor,
  RotateCcw,
  Circle,
  Check,
} from "lucide-react";
import { cn } from "@/lib/cn";

const STATUS_STEPS = ["open", "in_progress", "resolved", "closed"];

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;

  const [ticket, setTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAgent =
    currentUserProfile?.role === "admin" ||
    currentUserProfile?.role === "super_admin";

  const fetchTicketDetails = useCallback(async () => {
    setError("");
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, role, account_status")
      .eq("id", user.id)
      .single();
    if (profileError || !profile || profile.account_status !== "active") {
      setError(
        profileError?.message ||
          "Your staff profile is unavailable or inactive."
      );
      setLoading(false);
      return;
    }
    setCurrentUserProfile(profile);
    const profileIsAgent =
      profile.role === "admin" || profile.role === "super_admin";

    const { data: ticketData, error: ticketError } = await supabase
      .from("tickets")
      .select(
        "*, author:profiles!tickets_author_id_fkey(*), assignee:profiles!tickets_assignee_id_fkey(*)"
      )
      .eq("id", ticketId)
      .single();

    if (ticketError) setError(`Could not load ticket: ${ticketError.message}`);
    else setTicket(ticketData);

    const { data: commentData, error: commentError } = await supabase
      .from("comments")
      .select("*, author:profiles(*)")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (commentError) setError(`Could not load discussion: ${commentError.message}`);
    else setComments(commentData ?? []);

    if (profileIsAgent) {
      const { data: agentData, error: agentError } = await supabase
        .from("profiles")
        .select("id, display_name, department")
        .in("role", ["admin", "super_admin"])
        .eq("account_status", "active");
      if (agentError) setError(`Could not load assignees: ${agentError.message}`);
      else setAgents(agentData ?? []);
    }
    setLoading(false);
  }, [router, ticketId]);

  useEffect(() => {
    fetchTicketDetails();
  }, [fetchTicketDetails]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserProfile) return;
    if (isInternalNote && !isAgent) {
      setError("Only support agents can post internal notes.");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("comments").insert({
      ticket_id: ticketId,
      author_id: currentUserProfile.id,
      content: newComment,
      is_internal_note: isInternalNote,
    });

    if (!error) {
      setNewComment("");
      setIsInternalNote(false);
      fetchTicketDetails();
    } else {
      setError(`Reply failed: ${error.message}`);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!isAgent) return;
    const supabase = createClient();
    const updates: any = { status: newStatus };
    if (newStatus === "resolved" || newStatus === "closed") {
      updates.resolved_at = new Date().toISOString();
    }
    const { error: updateError } = await supabase
      .from("tickets")
      .update(updates)
      .eq("id", ticketId);
    if (updateError) {
      setError(`Status update failed: ${updateError.message}`);
      return;
    }
    fetchTicketDetails();
  };

  const handleAssigneeChange = async (assigneeId: string) => {
    if (!isAgent) return;
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tickets")
      .update({ assignee_id: assigneeId || null })
      .eq("id", ticketId);
    if (updateError) {
      setError(`Assignment failed: ${updateError.message}`);
      return;
    }
    fetchTicketDetails();
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAgent || !newSubtaskTitle.trim() || !ticket) return;

    const currentSubtasks = ticket.subtasks || [];
    const updated = [
      ...currentSubtasks,
      { id: Date.now().toString(), title: newSubtaskTitle, completed: false },
    ];

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tickets")
      .update({ subtasks: updated })
      .eq("id", ticketId);
    if (updateError) {
      setError(`Subtask update failed: ${updateError.message}`);
      return;
    }
    setNewSubtaskTitle("");
    fetchTicketDetails();
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!isAgent || !ticket) return;
    const currentSubtasks = ticket.subtasks || [];
    const updated = currentSubtasks.map((st: any) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tickets")
      .update({ subtasks: updated })
      .eq("id", ticketId);
    if (updateError) {
      setError(`Subtask update failed: ${updateError.message}`);
      return;
    }
    fetchTicketDetails();
  };

  const handleReopen = async () => {
    const supabase = createClient();
    const { error: reopenError } = await supabase.rpc("reopen_own_ticket", {
      target_ticket_id: ticketId,
    });
    if (reopenError) {
      setError(`Reopen failed: ${reopenError.message}`);
      return;
    }
    fetchTicketDetails();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
        Loading request #{ticketId}…
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="py-20 text-center text-sm text-[var(--muted)]">
        Ticket not found or access restricted.
      </div>
    );
  }

  const subtasks = ticket.subtasks || [];
  const completedSubtasks = subtasks.filter((st: any) => st.completed).length;
  const subtaskProgressPct =
    subtasks.length > 0
      ? Math.round((completedSubtasks / subtasks.length) * 100)
      : 0;
  const statusIndex = STATUS_STEPS.indexOf(ticket.status);
  const parsedDescription = parseTicketDescription(ticket.description);

  return (
    <div className="space-y-8">
      {error && (
        <Alert tone="error" role="alert">
          {error}
        </Alert>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge tone={statusTone(ticket.status)}>
              {ticket.status.replace("_", " ")}
            </StatusBadge>
            <StatusBadge tone="neutral">{ticket.category}</StatusBadge>
            <StatusBadge tone={priorityTone(ticket.priority)}>
              {ticket.priority === "urgent" ? "P0 Urgent" : ticket.priority}
            </StatusBadge>
            <span className="font-mono text-xs font-semibold text-[var(--faint)]">
              #{ticket.ticket_number}
            </span>
          </div>
          <h1 className="heading-page text-2xl md:text-3xl">{ticket.title}</h1>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Opened by{" "}
            <strong className="font-semibold text-[var(--ink)]">
              {ticket.author?.display_name}
            </strong>{" "}
            ({ticket.author?.user_type === "intern" ? "Intern" : "Staff"} ·{" "}
            {ticket.author?.department}) on{" "}
            {new Date(ticket.created_at).toLocaleString()}
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => exportTicketPDF(ticket)}
          className="shrink-0"
        >
          <Download className="h-4 w-4" /> Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Case path lifecycle */}
          <section className="surface p-6">
            <h2 className="font-display text-base font-bold">Case path</h2>
            <div className="case-path mt-5 space-y-0 pl-0">
              <ol className="relative ml-2 space-y-7 border-l-2 border-[var(--line-strong)] pl-6">
                {STATUS_STEPS.map((step, idx) => {
                  const reached = idx <= statusIndex;
                  const isCurrent = idx === statusIndex;
                  return (
                    <li key={step} className="relative">
                      <span
                        className={cn(
                          "absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full border-2",
                          reached
                            ? "border-[var(--brand)] bg-[var(--brand)]"
                            : "border-[var(--line-strong)] bg-[var(--surface)]"
                        )}
                      >
                        {reached ? (
                          <Check className="h-2.5 w-2.5 text-[var(--brand-on)]" />
                        ) : (
                          <Circle className="h-2 w-2 text-[var(--faint)]" />
                        )}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[11px] font-bold uppercase tracking-[0.12em]",
                          isCurrent
                            ? "text-[var(--brand-ink)]"
                            : reached
                            ? "text-[var(--ink)]"
                            : "text-[var(--faint)]"
                        )}
                      >
                        {step.replace("_", " ")}
                      </span>
                      {isCurrent && (
                        <span className="ml-2 rounded-full bg-[var(--brand-soft)] px-2 py-0.5 font-mono text-[9px] font-bold text-[var(--brand-ink)]">
                          Current
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          {/* Description */}
          <section className="surface p-6">
            <h2 className="font-display text-base font-bold">
              Issue description
            </h2>
            <div className="mt-4 whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-5 font-mono text-sm leading-relaxed text-[var(--ink-2)]">
              {parsedDescription.text}
            </div>
            <TicketAttachments attachments={parsedDescription.attachments} />
          </section>

          {/* Subtasks */}
          <section className="surface p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold">
                Sub-task checklist ({completedSubtasks}/{subtasks.length})
              </h2>
              <span className="font-mono text-xs font-bold text-[var(--brand-ink)]">
                {subtaskProgressPct}% complete
              </span>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full rounded-full bg-[var(--brand)] transition-all duration-300"
                style={{ width: `${subtaskProgressPct}%` }}
              />
            </div>

            <ul className="mt-4 space-y-2">
              {subtasks.map((st: any) => (
                <li
                  key={st.id}
                  onClick={() => isAgent && handleToggleSubtask(st.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 transition",
                    isAgent && "cursor-pointer hover:border-[var(--line-strong)]"
                  )}
                >
                  {st.completed ? (
                    <CheckSquare className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                  ) : (
                    <Square className="h-4 w-4 shrink-0 text-[var(--faint)]" />
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      st.completed
                        ? "text-[var(--faint)] line-through"
                        : "text-[var(--ink)]"
                    )}
                  >
                    {st.title}
                  </span>
                </li>
              ))}
            </ul>

            {isAgent && (
              <form onSubmit={handleAddSubtask} className="mt-4 flex gap-2">
                <Input
                  type="text"
                  placeholder="Add new subtask step..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                />
                <Button type="submit" variant="secondary" className="shrink-0 !px-4">
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            )}
          </section>

          {/* Timeline */}
          <section>
            <h2 className="font-display text-base font-bold">
              Timeline &amp; discussion ({comments.length})
            </h2>
            <div className="mt-4 space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={cn(
                    "rounded-2xl border p-5",
                    comment.is_internal_note
                      ? "border-[var(--warning)]/30 bg-[var(--warning-soft)]"
                      : "border-[var(--line)] bg-[var(--surface)]"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--ink)]">
                        {comment.author?.display_name || "System"}
                      </span>
                      {comment.is_internal_note && (
                        <StatusBadge tone="warning">
                          <Lock className="h-3 w-3" /> Internal note
                        </StatusBadge>
                      )}
                    </div>
                    <span className="font-mono text-[10px] font-medium text-[var(--faint)]">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[var(--ink-2)]">
                    {comment.content}
                  </p>
                </div>
              ))}

              <form
                onSubmit={handlePostComment}
                className="surface space-y-4 p-5"
              >
                <Textarea
                  rows={4}
                  placeholder="Leave a comment or reply..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  required
                  className="font-mono text-sm"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  {isAgent ? (
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--muted)]">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--line-strong)] text-[var(--warning)] focus:ring-[var(--warning-soft)]"
                      />
                      Post as internal note (hidden from employee)
                    </label>
                  ) : (
                    <div />
                  )}
                  <Button type="submit">
                    <Send className="h-4 w-4" /> Submit reply
                  </Button>
                </div>
              </form>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="surface space-y-5 p-5">
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={ticket.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                disabled={!isAgent}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Select>
              {!isAgent &&
                ticket.author_id === currentUserProfile?.id &&
                ["resolved", "closed"].includes(ticket.status) && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleReopen}
                    className="mt-3 w-full"
                  >
                    <RotateCcw className="h-4 w-4" /> Reopen within 7 days
                  </Button>
                )}
            </div>

            <div>
              <FieldLabel>Assignee</FieldLabel>
              <Select
                value={ticket.assignee_id || ""}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                disabled={!isAgent}
              >
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.display_name} ({agent.department})
                  </option>
                ))}
              </Select>
            </div>
          </section>

          <section className="surface space-y-3 p-5">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Reporter info
            </h3>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-soft)]">
                <User className="h-4 w-4 text-[var(--brand-ink)]" />
              </span>
              <div>
                <span className="block text-sm font-semibold text-[var(--ink)]">
                  {ticket.author?.display_name}
                </span>
                <span className="block text-xs text-[var(--muted)]">
                  {ticket.author?.email}
                </span>
              </div>
            </div>
            <StatusBadge
              tone={
                ticket.author?.user_type === "intern" ? "warning" : "neutral"
              }
            >
              {ticket.author?.user_type === "intern"
                ? `Intern (Supervisor: ${
                    ticket.author?.supervisor_name || "N/A"
                  })`
                : `Staff (${ticket.author?.department})`}
            </StatusBadge>
          </section>

          <section className="surface space-y-3 p-5">
            <h3 className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              <Monitor className="h-3.5 w-3.5" /> System context
            </h3>
            {ticket.device_context ? (
              <div className="space-y-1.5 font-mono text-xs text-[var(--muted)]">
                <p>
                  <strong className="font-semibold text-[var(--ink)]">
                    Screen:
                  </strong>{" "}
                  {ticket.device_context.screenResolution}
                </p>
                <p className="break-all">
                  <strong className="font-semibold text-[var(--ink)]">
                    Browser:
                  </strong>{" "}
                  {ticket.device_context.userAgent}
                </p>
              </div>
            ) : (
              <p className="text-xs text-[var(--faint)]">
                No device context attached.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

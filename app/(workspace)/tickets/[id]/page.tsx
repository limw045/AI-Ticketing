"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { BackButton } from "@/components/ui/BackButton";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { getPortalMode, type PortalMode } from "@/lib/portal-mode";

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
  const [deletedTicket, setDeletedTicket] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentNotice, setCommentNotice] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [mobileTab, setMobileTab] = useState<"conversation" | "details">("conversation");
  const [portalMode, setPortalMode] = useState<PortalMode>("user");

  const isAgent =
    currentUserProfile?.role === "admin" ||
    currentUserProfile?.role === "super_admin";
  const canManageTicket = isAgent && portalMode === "admin";
  const isAuthor = ticket?.author_id === currentUserProfile?.id;
  const canReply = canManageTicket || isAuthor;
  const canSeeSensitiveContext = canManageTicket || isAuthor;

  const loadComments = useCallback(async () => {
    const supabase = createClient();
    const { data, error: commentError } = await supabase
      .from("comment_details")
      .select(
        "id, ticket_id, author_id, content, is_internal_note, type, created_at, updated_at, deleted_at, author"
      )
      .eq("ticket_id", ticketId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (!commentError) setComments(data ?? []);
    return commentError;
  }, [ticketId]);

  const fetchTicketDetails = useCallback(async () => {
    setError("");
    setDeletedTicket(false);
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name, email, department, user_type, supervisor_name, role, account_status")
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
    const activePortalMode = getPortalMode();
    setPortalMode(activePortalMode);
    const profileCanManage =
      (profile.role === "admin" || profile.role === "super_admin") && activePortalMode === "admin";

    const safeTicketSelect = "id, ticket_number, title, description, status, priority, category, author_id, assignee_id, source, subtasks, created_at, updated_at, resolved_at, deleted_at, author:profiles!tickets_author_id_fkey(id, display_name, department, user_type), assignee:profiles!tickets_assignee_id_fkey(id, display_name, department)";
    const managementTicketSelect = "*, author:profiles!tickets_author_id_fkey(*), assignee:profiles!tickets_assignee_id_fkey(*)";

    const ticketResult = await supabase
      .from("tickets")
      .select(profileCanManage ? managementTicketSelect : safeTicketSelect)
      .eq("id", ticketId)
      .is("deleted_at", null)
      .maybeSingle();
    const { data: ticketData, error: ticketError } = ticketResult as unknown as { data: any; error: any };

    if (ticketError) {
      setError(`Could not load ticket: ${ticketError.message}`);
    } else if (ticketData) {
      setTicket(ticketData.author_id === profile.id
        ? { ...ticketData, author: { ...ticketData.author, email: profile.email, supervisor_name: profile.supervisor_name } }
        : ticketData);
    } else if (profileCanManage) {
      const { data: removed } = await supabase
        .from("tickets")
        .select("id")
        .eq("id", ticketId)
        .not("deleted_at", "is", null)
        .maybeSingle();
      setDeletedTicket(Boolean(removed));
    }

    const commentError = await loadComments();
    if (commentError) setError(`Could not load discussion: ${commentError.message}`);

    if (profileCanManage) {
      const { data: agentData, error: agentError } = await supabase
        .from("profiles")
        .select("id, display_name, department")
        .in("role", ["admin", "super_admin"])
        .eq("account_status", "active");
      if (agentError) setError(`Could not load assignees: ${agentError.message}`);
      else setAgents(agentData ?? []);
    }
    setLoading(false);
  }, [loadComments, router, ticketId]);

  useEffect(() => {
    fetchTicketDetails();
  }, [fetchTicketDetails]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!content || !currentUserProfile || isPostingComment || !canReply) return;
    if (isInternalNote && !canManageTicket) {
      setError("Only support agents can post internal notes.");
      return;
    }

    setError("");
    setCommentNotice("");
    setIsPostingComment(true);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("comments")
      .insert({
        ticket_id: ticketId,
        author_id: currentUserProfile.id,
        content,
        is_internal_note: isInternalNote,
      });

    if (!insertError) {
      setNewComment("");
      setIsInternalNote(false);
      const refreshError = await loadComments();
      if (refreshError) {
        setError(
          `Reply saved, but the discussion could not refresh: ${refreshError.message}`
        );
      } else {
        setCommentNotice("Reply posted.");
      }
    } else {
      setError(`Reply failed: ${insertError.message}`);
    }
    setIsPostingComment(false);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!canManageTicket) return;
    const supabase = createClient();
    const updates: any = { status: newStatus };
    if (newStatus === "resolved" || newStatus === "closed") {
      updates.resolved_at = new Date().toISOString();
    }
    const { error: updateError } = await supabase
      .from("tickets")
      .update(updates)
      .eq("id", ticketId)
      .is("deleted_at", null);
    if (updateError) {
      setError(`Status update failed: ${updateError.message}`);
      return;
    }
    fetchTicketDetails();
  };

  const handleAssigneeChange = async (assigneeId: string) => {
    if (!canManageTicket) return;
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tickets")
      .update({ assignee_id: assigneeId || null })
      .eq("id", ticketId)
      .is("deleted_at", null);
    if (updateError) {
      setError(`Assignment failed: ${updateError.message}`);
      return;
    }
    fetchTicketDetails();
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTicket || !newSubtaskTitle.trim() || !ticket) return;

    const currentSubtasks = ticket.subtasks || [];
    const updated = [
      ...currentSubtasks,
      { id: Date.now().toString(), title: newSubtaskTitle, completed: false },
    ];

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tickets")
      .update({ subtasks: updated })
      .eq("id", ticketId)
      .is("deleted_at", null);
    if (updateError) {
      setError(`Subtask update failed: ${updateError.message}`);
      return;
    }
    setNewSubtaskTitle("");
    fetchTicketDetails();
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!canManageTicket || !ticket) return;
    const currentSubtasks = ticket.subtasks || [];
    const updated = currentSubtasks.map((st: any) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("tickets")
      .update({ subtasks: updated })
      .eq("id", ticketId)
      .is("deleted_at", null);
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
    return <PageSkeleton variant="ticket-detail" />;
  }

  if (!ticket) {
    return (
      <div className="space-y-5 py-12">
        <BackButton href="/tickets" />
        {deletedTicket ? (
          <Alert tone="warning" role="status">
            <strong className="block">This ticket has been moved to the recycle bin.</strong>
            <span className="mt-1 block">Restore it before opening its details.</span>
            <Link href="/admin/recycle-bin" className="mt-3 inline-flex font-semibold underline underline-offset-2">
              Go to recycle bin
            </Link>
          </Alert>
        ) : error ? (
          <Alert tone="error" role="alert">
            <span>{error}</span>
            <Button type="button" variant="secondary" onClick={() => void fetchTicketDetails()} className="mt-3">Retry</Button>
          </Alert>
        ) : (
          <div className="surface py-16 text-center text-sm text-[var(--muted)]">Ticket not found or access restricted.</div>
        )}
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
      <BackButton href="/tickets" />
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

      <div className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-20 grid grid-cols-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[var(--shadow-sm)] lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("conversation")}
          className={cn("min-h-11 rounded-lg text-sm font-semibold transition", mobileTab === "conversation" ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]" : "text-[var(--muted)]")}
        >
          Conversation ({comments.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("details")}
          className={cn("min-h-11 rounded-lg text-sm font-semibold transition", mobileTab === "details" ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]" : "text-[var(--muted)]")}
        >
          Details
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-8 lg:col-span-2">
          {/* Case path lifecycle */}
          <section className={cn("surface p-4 sm:p-6", mobileTab !== "details" && "hidden lg:block")}>
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
          <section className={cn("surface p-4 sm:p-6", mobileTab !== "details" && "hidden lg:block")}>
            <h2 className="font-display text-base font-bold">
              Issue description
            </h2>
            <div className="mt-4 whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-5 font-mono text-sm leading-relaxed text-[var(--ink-2)]">
              {parsedDescription.text}
            </div>
            <TicketAttachments attachments={parsedDescription.attachments} />
          </section>

          {/* Subtasks */}
          <section className={cn("surface p-4 sm:p-5", mobileTab !== "details" && "hidden lg:block")}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold">
                Sub-tasks
              </h2>
              <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 font-mono text-[10px] font-bold text-[var(--brand-ink)]">
                {completedSubtasks} / {subtasks.length}
              </span>
            </div>

            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full rounded-full bg-[var(--brand)] transition-all duration-300"
                style={{ width: `${subtaskProgressPct}%` }}
              />
            </div>

            <ul className="mt-3 divide-y divide-[var(--line)]">
              {subtasks.map((st: any) => (
                <li key={st.id}>
                  <button
                    type="button"
                    disabled={!canManageTicket}
                    onClick={() => handleToggleSubtask(st.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-soft)]",
                      canManageTicket && "hover:bg-[var(--surface-2)]"
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
                  </button>
                </li>
              ))}
              {subtasks.length === 0 && (
                <li className="py-4 text-sm text-[var(--faint)]">
                  No sub-tasks yet.
                </li>
              )}
            </ul>

            {canManageTicket && (
              <form onSubmit={handleAddSubtask} className="mt-3 flex gap-2">
                <Input
                  type="text"
                  placeholder="Add a sub-task…"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="!rounded-lg !px-3 !py-2.5"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  aria-label="Add sub-task"
                  className="!h-10 !w-10 shrink-0 !rounded-lg !p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            )}
          </section>

          {/* Timeline */}
          <section className={cn(mobileTab !== "conversation" && "hidden lg:block")}>
            <h2 className="font-display text-base font-bold">
              Timeline &amp; discussion ({comments.length})
            </h2>
            <div className="mt-4 space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={cn(
                    "rounded-2xl border p-4 sm:p-5",
                    comment.is_internal_note
                      ? "border-[var(--warning)]/30 bg-[var(--warning-soft)]"
                      : "border-[var(--line)] bg-[var(--surface)]"
                  )}
                >
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                    <span className="font-mono text-[10px] font-medium text-[var(--faint)] sm:text-right">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[var(--ink-2)]">
                    {comment.content}
                  </p>
                </div>
              ))}

              {canReply ? <form
                onSubmit={handlePostComment}
                className="surface space-y-4 p-4 sm:p-5"
              >
                {commentNotice && <Alert tone="success">{commentNotice}</Alert>}
                <Textarea
                  rows={4}
                  placeholder="Leave a comment or reply..."
                  value={newComment}
                  onChange={(e) => {
                    setNewComment(e.target.value);
                    setCommentNotice("");
                  }}
                  required
                  disabled={isPostingComment}
                  className="font-mono text-sm"
                />

                <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  {canManageTicket ? (
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--muted)]">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        disabled={isPostingComment}
                        className="h-4 w-4 rounded border-[var(--line-strong)] text-[var(--warning)] focus:ring-[var(--warning-soft)]"
                      />
                      Post as internal note (hidden from employee)
                    </label>
                  ) : (
                    <div />
                  )}
                  <Button
                    type="submit"
                    disabled={isPostingComment || !newComment.trim()}
                    className="w-full sm:w-auto"
                  >
                    <Send className="h-4 w-4" />
                    {isPostingComment ? "Submitting…" : "Submit reply"}
                  </Button>
                </div>
              </form> : (
                <Alert tone="info">You can follow this department request, but only its author can reply or reopen it.</Alert>
              )}
            </div>
          </section>
        </div>

        <aside className={cn("space-y-6", mobileTab !== "details" && "hidden lg:block")}>
          <section className="surface space-y-5 p-5">
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={ticket.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                disabled={!canManageTicket}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Select>
              {!canManageTicket &&
                isAuthor &&
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
                disabled={!canManageTicket}
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
                {canSeeSensitiveContext && <span className="block break-all text-xs text-[var(--muted)]">{ticket.author?.email}</span>}
              </div>
            </div>
            <StatusBadge
              tone={
                ticket.author?.user_type === "intern" ? "warning" : "neutral"
              }
            >
              {ticket.author?.user_type === "intern" && canSeeSensitiveContext
                ? `Intern (Supervisor: ${
                    ticket.author?.supervisor_name || "N/A"
                  })`
                : `${ticket.author?.user_type === "intern" ? "Intern" : "Staff"} (${ticket.author?.department})`}
            </StatusBadge>
          </section>

          {canSeeSensitiveContext && <section className="surface space-y-3 p-5">
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
          </section>}
        </aside>
      </div>
    </div>
  );
}
